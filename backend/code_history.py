import os
import re
import json
import time
import databutton as db
import hashlib
import ast
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from collections import defaultdict
from pathlib import Path

#-------------------------------------------------------------------------
# DATA MODELS
#-------------------------------------------------------------------------

class FileHealthMetric(BaseModel):
    filepath: str
    size_score: int  # 0-100, higher is better
    complexity_score: int  # 0-100, higher is better
    duplication_score: int  # 0-100, higher is better
    function_length_score: int  # 0-100, higher is better
    comment_density_score: int  # 0-100, higher is better
    naming_convention_score: int  # 0-100, higher is better
    issues: List[str] = []

class ComponentHealthMetric(BaseModel):
    name: str
    files: List[FileHealthMetric]
    score: int  # 0-100, higher is better
    issues: List[str] = []

class CodeHealthResponse(BaseModel):
    overall_score: int  # 0-100, higher is better
    components: List[ComponentHealthMetric]
    recommendations: List[str] = []

class FileNode(BaseModel):
    name: str
    path: str
    type: str  # 'file' or 'directory'
    size: int
    last_modified: Optional[float] = None
    children: Optional[List[Any]] = None
    imports: Optional[List[Dict[str, str]]] = None

# Initialize router
router = APIRouter()

#-------------------------------------------------------------------------
# COMMON HELPER FUNCTIONS
#-------------------------------------------------------------------------

def get_file_extension(file_path):
    _, ext = os.path.splitext(file_path)
    return ext.lower()[1:] if ext else ""

def read_file_content(full_path):
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading {full_path}: {str(e)}")
        return ""

def extract_code_blocks(content, min_lines=3):
    code_blocks = []
    lines = content.split('\n')
    for i in range(len(lines) - min_lines + 1):
        block = '\n'.join(lines[i:i+min_lines])
        block_hash = hashlib.md5(block.encode()).hexdigest()
        code_blocks.append({
            'file': None,  # will be set by caller
            'start_line': i + 1,
            'block': block,
            'hash': block_hash
        })
    return code_blocks

def compute_size_score(content, is_api=False):
    file_len = len(content)
    issues = []
    if is_api:
        if file_len > 20000:
            score = 25
            issues.append(f"Very large file size ({file_len // 1000}KB)")
        elif file_len > 10000:
            score = 50
            issues.append(f"Large file size ({file_len // 1000}KB)")
        else:
            score = 100
    else:
        if file_len > 20000:
            score = 25
            issues.append(f"Very large file: {file_len // 1000}KB")
        elif file_len > 10000:
            score = 50
            issues.append(f"Large file: {file_len // 1000}KB")
        elif file_len > 5000:
            score = 75
        else:
            score = 100
    return score, issues

def compute_duplication_score(dup_count):
    if dup_count > 10:
        return 0, f"Severe code duplication ({dup_count} blocks)"
    elif dup_count > 5:
        return 50, f"Moderate code duplication ({dup_count} blocks)"
    elif dup_count > 0:
        return 75, f"Minor code duplication ({dup_count} blocks)"
    else:
        return 100, None

def compute_complexity_score(content, file_path):
    score = 100
    issues = []
    if file_path.endswith(('.js', '.jsx', '.ts', '.tsx')):
        constructs = (len(re.findall(r'for\s*\(.*\)\s*{', content)) +
                      len(re.findall(r'if\s*\(.*\)\s*{', content)) +
                      len(re.findall(r'switch\s*\(.*\)\s*{', content)))
        if constructs > 20:
            score = 50
            issues.append(f"High complexity in {file_path} ({constructs} constructs)")
        elif constructs > 10:
            score = 75
    return score, issues

def compute_function_length_score(content, file_path):
    score = 100
    issues = []
    function_pattern = r'(function\s+\w+|const\s+\w+\s*=\s*function|const\s+\w+\s*=\s*\(.*?\)\s*=>)\s*\{'
    long_functions = 0
    for match in re.finditer(function_pattern, content):
        start = match.start()
        open_braces = 1
        for i in range(start + match.group(0).find('{') + 1, len(content)):
            if content[i] == '{':
                open_braces += 1
            elif content[i] == '}':
                open_braces -= 1
                if open_braces == 0:
                    end = i
                    break
        else:
            continue
        func_lines = content[start:end].count('\n')
        if func_lines > 50:
            long_functions += 1
            issues.append(f"Function too long in {file_path} ({func_lines} lines)")
    if long_functions:
        score = max(100 - min(long_functions * 25, 100), 0)
    return score, issues

def compute_comment_density_score(content, file_path):
    score = 100
    issues = []
    lines = content.split('\n')
    non_empty = [line for line in lines if line.strip()]
    if non_empty:
        if file_path.endswith(('.js', '.jsx', '.ts', '.tsx')):
            comment_lines = len([line for line in lines if re.match(r'\s*//|/\*|\*', line)])
        elif file_path.endswith('.py'):
            comment_lines = len([line for line in lines if line.strip().startswith('#')])
        else:
            comment_lines = 0
        ratio = comment_lines / len(non_empty)
        if ratio < 0.05 and len(non_empty) > 30:
            score = 50
            issues.append(f"Low comment density in {file_path} ({round(ratio*100)}%)")
    return score, issues

def compute_naming_convention_score(content, file_path):
    score = 100
    issues = []
    if file_path.endswith(('.tsx', '.jsx')):
        base = os.path.basename(file_path).split('.')[0]
        pattern = f"function\\s+{base}|const\\s+{base}\\s*="
        if not re.search(pattern, content):
            score = 50
            issues.append(f"Component name doesn't match filename in {file_path}")
    elif file_path.endswith('.py'):
        class_pattern = r'class\s+([a-zA-Z_]\w*)'
        for match in re.finditer(class_pattern, content):
            name = match.group(1)
            if not re.match(r'^[A-Z][a-zA-Z0-9]*$', name):
                issues.append(f"Class '{name}' should use CamelCase")
        func_pattern = r'def\s+([a-zA-Z_]\w*)'
        for match in re.finditer(func_pattern, content):
            name = match.group(1)
            if not (re.match(r'^[a-z][a-z0-9_]*$', name) or name.startswith('__')):
                issues.append(f"Function '{name}' should use snake_case")
    return score, issues

def analyze_file_metric(filepath, content, dup_count, is_api=False):
    size_score, size_issues = compute_size_score(content, is_api=is_api)
    duplication_score, dup_issue = compute_duplication_score(dup_count)
    issues = size_issues.copy()
    if dup_issue:
        issues.append(dup_issue)
    if is_api:
        complexity_score = 100
        function_length_score = 100
        comment_density_score = 100
        naming_convention_score = 100
    else:
        complexity_score, comp_issues = compute_complexity_score(content, filepath)
        function_length_score, func_issues = compute_function_length_score(content, filepath)
        comment_density_score, comment_issues = compute_comment_density_score(content, filepath)
        naming_convention_score, naming_issues = compute_naming_convention_score(content, filepath)
        issues.extend(comp_issues)
        issues.extend(func_issues)
        issues.extend(comment_issues)
        issues.extend(naming_issues)
    return FileHealthMetric(
        filepath=filepath,
        size_score=size_score,
        complexity_score=complexity_score,
        duplication_score=duplication_score,
        function_length_score=function_length_score,
        comment_density_score=comment_density_score,
        naming_convention_score=naming_convention_score,
        issues=issues
    )

def aggregate_duplications(code_blocks):
    duplicate_blocks = defaultdict(list)
    for block in code_blocks:
        duplicate_blocks[block['hash']].append(block)
    duplications = {h: blocks for h, blocks in duplicate_blocks.items() if len(blocks) > 1}
    file_duplications = defaultdict(int)
    for blocks in duplications.values():
        for block in blocks:
            file_duplications[block['file']] += 1
    return file_duplications

#-------------------------------------------------------------------------
# FILE ANALYSIS UTILITIES (Scanning, Import Extraction)
#-------------------------------------------------------------------------

def extract_imports(file_path, content, root_path="/app"):
    imports = []
    ext = get_file_extension(file_path)
    if ext in ['js', 'jsx', 'ts', 'tsx']:
        patterns = [
            (r'import\s+.*?\s+from\s+[\'"](.*?)[\'"]', 'module'),
            (r'import\s+[\'"](.*?)[\'"]', 'direct'),
            (r'require\s*\(\s*[\'"](.*?)[\'"]', 'require'),
        ]
        for pattern, typ in patterns:
            for match in re.findall(pattern, content):
                if match:
                    imports.append({'path': match, 'type': typ})
    elif ext == 'py':
        patterns = [
            (r'import\s+([\w\.]+)', 'module'),
            (r'from\s+([\w\.]+)\s+import', 'from'),
        ]
        for pattern, typ in patterns:
            for match in re.findall(pattern, content):
                if match:
                    imports.append({'path': match, 'type': typ})
    return imports

def _scan_file(full_path, current_path, name):
    try:
        size = os.path.getsize(full_path)
        last_modified = os.path.getmtime(full_path)
        imports = []
        if get_file_extension(full_path) in ['js', 'jsx', 'ts', 'tsx', 'py']:
            content = read_file_content(full_path)
            imports = extract_imports(current_path, content)
        return FileNode(
            name=name,
            path=current_path,
            type="file",
            size=size,
            last_modified=last_modified,
            imports=imports
        )
    except (PermissionError, FileNotFoundError):
        return None

def _scan_directory(base_path, full_path, current_path, name, max_depth):
    children = []
    total_size = 0
    try:
        items = os.listdir(full_path)[:100]
        for item in items:
            item_path = os.path.join(current_path, item)
            child = scan_directory(base_path, item_path, max_depth - 1)
            if child:
                children.append(child)
                total_size += child.size if child.size else 0
    except PermissionError:
        pass
    return FileNode(
        name=name,
        path=current_path or "/",
        type="directory",
        size=total_size,
        children=children,
        last_modified=os.path.getmtime(full_path) if os.path.exists(full_path) else None
    )

def scan_directory(base_path, current_path="", max_depth=5):
    full_path = os.path.join(base_path, current_path)
    if not os.path.exists(full_path):
        return None
    name = os.path.basename(current_path) or os.path.basename(base_path)
    excluded_dirs = ['.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.next', '.idea']
    if name in excluded_dirs:
        return FileNode(name=name, path=current_path or "/", type="directory", size=0, children=[], last_modified=os.path.getmtime(full_path))
    if os.path.isdir(full_path):
        return _scan_directory(base_path, full_path, current_path, name, max_depth)
    else:
        return _scan_file(full_path, current_path, name)

def scan_codebase_structure():
    try:
        base_path = "/app"
        structure = FileNode(name="App", path="/", type="directory", size=0, children=[])
        categories = {
            "Pages": "/ui/src/pages",
            "UI Components": "/ui/src/components",
            "UI Files": "/ui/src/utils",
            "APIs": "/src/app/apis"
        }
        for cat_name, rel_path in categories.items():
            _scan_category(base_path, rel_path, cat_name, structure)
        return structure
    except Exception as e:
        print(f"Error scanning codebase structure: {str(e)}")
        return None

def _scan_category(base_path, rel_path, cat_name, structure):
    path = rel_path.lstrip('/')
    dir_path = os.path.join(base_path, path)
    if os.path.exists(dir_path) and os.path.isdir(dir_path):
        category_node = FileNode(name=cat_name, path=rel_path, type="directory", size=0, children=[])
        node = scan_directory(base_path, path)
        if node and node.children:
            category_node.children = node.children
            category_node.size = node.size
            structure.children.append(category_node)
            if cat_name == "APIs":
                print(f"APIs category scanned with {len(node.children)} children")
                _debug_print_api_files(node)

def _debug_print_api_files(node):
    api_files_count = 0
    if node and node.children:
        for child in node.children:
            print(f"  - {child.name} ({child.path}) [{child.type}]")
            if child.type == "directory" and child.children:
                py_files = [f for f in child.children if f.name.endswith(".py")]
                api_files_count += len(py_files)
                for py_file in py_files:
                    print(f"    - {py_file.name} ({py_file.path})")
            elif child.name.endswith(".py"):
                api_files_count += 1
    print(f"Found {api_files_count} Python files in API directories")

#-------------------------------------------------------------------------
# FILE CONTENT COLLECTION & DUPLICATION ANALYSIS
#-------------------------------------------------------------------------

def _collect_file_contents(section, is_api=False, excluded_files=None):
    file_contents = {}
    code_blocks = []
    if not section.children:
        return file_contents, code_blocks
    for node in section.children:
        if is_api and node.type == "directory":
            _process_api_directory(node, file_contents, code_blocks)
        elif node.type == "file" and (excluded_files is None or node.path not in excluded_files):
            _process_regular_file(node, file_contents, code_blocks)
    return file_contents, code_blocks

def _process_api_directory(node, file_contents, code_blocks):
    init_path = os.path.join(node.path, "__init__.py")
    _process_file_generic(init_path, file_contents, code_blocks, is_api=True)
    if node.children:
        for child in node.children:
            if child.type == "file" and child.name.endswith(".py"):
                _process_file_generic(child.path, file_contents, code_blocks, is_api=True)
            elif child.type == "directory":
                _process_api_directory(child, file_contents, code_blocks)

def _process_regular_file(node, file_contents, code_blocks):
    _process_file_generic(node.path, file_contents, code_blocks, is_api=False)

def _process_file_generic(path, file_contents, code_blocks, is_api):
    full_path = os.path.join("/app", path)
    content = read_file_content(full_path)
    if content:
        file_contents[path] = content
        blocks = extract_code_blocks(content)
        for block in blocks:
            block['file'] = path
        code_blocks.extend(blocks)

def extract_all_files(node):
    files = []
    if hasattr(node, 'type') and node.type == "file":
        files.append(node)
    elif hasattr(node, 'children') and node.children:
        for child in node.children:
            files.extend(extract_all_files(child))
    return files

#-------------------------------------------------------------------------
# CODE HEALTH ANALYSIS
#-------------------------------------------------------------------------

def analyze_section(section, section_type):
    file_metrics = []
    section_issues = []
    total_score = 0
    excluded_files = [
        "ui/src/pages/CodeHealth.tsx",
        "ui/src/pages/NotFoundPage.tsx",
        "ui/src/pages/SomethingWentWrongPage.tsx",
        "ui/src/pages/brain.ts",
        "ui/src/components/.gitkeep",
        "ui/src/utils/.gitkeep",
        "src/app/__init__.py",
        "src/app/apis/__init__.py"
    ]
    file_contents, code_blocks = _collect_file_contents(section, is_api=(section_type=="api"), excluded_files=excluded_files)
    file_duplications = aggregate_duplications(code_blocks)
    # Recursively extract all file nodes to ensure all files are included
    file_nodes = extract_all_files(section)
    for node in file_nodes:
        if node.type == "file" and node.path not in excluded_files:
            content = file_contents.get(node.path, "")
            dup_count = file_duplications.get(node.path, 0)
            is_api_flag = (section_type=="api")
            metric = analyze_file_metric(node.path, content, dup_count, is_api=is_api_flag)
            file_metrics.append(metric)
            total_score += round((metric.size_score + metric.complexity_score +
                                  metric.duplication_score + metric.function_length_score +
                                  metric.comment_density_score + metric.naming_convention_score) / 6)
    section_score = round(total_score / len(file_metrics)) if file_metrics else 0
    return {"files": file_metrics, "score": section_score, "issues": section_issues}

def generate_recommendations(issues):
    recommendations = []
    if any("large file" in issue.lower() for issue in issues):
        recommendations.append("Consider breaking down large files into smaller, focused components")
    if any("import" in issue.lower() for issue in issues):
        recommendations.append("Reduce import dependencies by consolidating related functionality")
    if any("duplication" in issue.lower() for issue in issues):
        recommendations.append("Refactor duplicated code into reusable functions or components")
    if any("function" in issue.lower() and "lines" in issue.lower() for issue in issues):
        recommendations.append("Break down long functions into smaller, single-responsibility functions")
    if any("comment density" in issue.lower() for issue in issues):
        recommendations.append("Improve code documentation with more meaningful comments for complex logic")
    if any("naming" in issue.lower() for issue in issues):
        recommendations.append("Standardize naming conventions across the codebase for better readability")
    recommendations.append("Regularly review and refactor complex components")
    recommendations.append("Maintain consistent file organization and naming conventions")
    return recommendations

def store_health_check_results(results):
    try:
        history = db.storage.json.get("code-health-history", default=[])
        timestamped = {
            "timestamp": time.time(),
            "date": datetime.now().isoformat(),
            "results": results.dict()
        }
        history.append(timestamped)
        if len(history) > 10:
            history = history[-10:]
        db.storage.json.put("code-health-history", history)
    except Exception as e:
        print(f"Error storing health check history: {str(e)}")

@router.get("/analyze", tags=["noauth"])
def analyze_code_health():
    codebase_structure = scan_codebase_structure()
    if not codebase_structure:
        raise HTTPException(status_code=500, detail="Failed to scan codebase structure")
    codebase = type('CodebaseDummy', (), {'structure': codebase_structure})()
    component_metrics = []
    all_issues = []
    if hasattr(codebase, 'structure') and codebase.structure.children:
        for section in codebase.structure.children:
            if section.name == "Pages":
                data = analyze_section(section, "page")
                component_metrics.append(ComponentHealthMetric(name="Pages", files=data["files"], score=data["score"], issues=data["issues"]))
                all_issues.extend(data["issues"])
            elif section.name == "UI Components":
                data = analyze_section(section, "component")
                component_metrics.append(ComponentHealthMetric(name="UI Components", files=data["files"], score=data["score"], issues=data["issues"]))
                all_issues.extend(data["issues"])
            elif section.name == "APIs":
                data = analyze_section(section, "api")
                component_metrics.append(ComponentHealthMetric(name="APIs", files=data["files"], score=data["score"], issues=data["issues"]))
                all_issues.extend(data["issues"])
            elif section.name == "UI Files":
                data = analyze_section(section, "util")
                component_metrics.append(ComponentHealthMetric(name="UI Files", files=data["files"], score=data["score"], issues=data["issues"]))
                all_issues.extend(data["issues"])
    # Calculate sum of all individual metric scores across all files
    total_points = sum(
        f.size_score + f.complexity_score + f.duplication_score +
        f.function_length_score + f.comment_density_score + f.naming_convention_score
        for comp in component_metrics for f in comp.files
    )
    # Each file has 6 metrics, each with a max score of 100
    total_possible = 6 * 100 * sum(len(comp.files) for comp in component_metrics)
    # Calculate overall percentage
    overall_score = round((total_points / total_possible) * 100) if total_possible > 0 else 0
    recommendations = generate_recommendations(all_issues)
    response = CodeHealthResponse(overall_score=overall_score, components=component_metrics, recommendations=recommendations)
    store_health_check_results(response)
    return response

@router.get("/health-history", tags=["noauth"])
def get_health_check_history():
    try:
        history = db.storage.json.get("code-health-history", default=[])
        return history
    except Exception as e:
        return {"error": f"Error retrieving health check history: {str(e)}"}

@router.get("/firestore-analysis", tags=["noauth"])
def analyze_firestore_usage():
    codebase_structure = scan_codebase_structure()
    if not codebase_structure:
        raise HTTPException(status_code=500, detail="Failed to scan codebase structure")
    codebase = type('CodebaseDummy', (), {'structure': codebase_structure})()
    collections = {}
    collection_patterns = [
        r"collection\(db,\s*['\"](.+?)['\"]\)",
        r"COLLECTIONS\.(\w+)"
    ]
    operations = ['getDocs', 'getDoc', 'setDoc', 'updateDoc', 'deleteDoc', 'addDoc']
    operation_usage = {op: [] for op in operations}
    files = extract_all_files(codebase.structure)
    for file_node in files:
        if file_node.path.endswith(('.ts', '.tsx', '.js', '.jsx')):
            full_path = os.path.join("/app", file_node.path)
            content = read_file_content(full_path)
            for pattern in collection_patterns:
                for match in re.findall(pattern, content):
                    collections.setdefault(match, []).append(file_node.path)
            for op in operations:
                if op in content:
                    operation_usage[op].append(file_node.path)
    collection_analysis = {
        "collections": collections,
        "operations": operation_usage,
        "recommendations": []
    }
    if collections:
        collection_analysis["recommendations"].append("Ensure consistent collection naming and access patterns across the codebase")
    if any(operation_usage[op] for op in ['setDoc', 'updateDoc', 'deleteDoc']):
        collection_analysis["recommendations"].append("Verify Firestore security rules are properly configured for write operations")
    return collection_analysis
