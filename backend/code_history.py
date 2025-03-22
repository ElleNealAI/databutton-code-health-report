import os
import re
import json
import time
import databutton as db
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import ast
import hashlib
from collections import defaultdict
from pathlib import Path

# Helper functions for enhanced analysis
def extract_function_info(filepath, content):
    """Extract information about functions in a file"""
    functions = []
    
    if filepath.endswith('.py'):
        try:
            # Parse Python code to get function definitions
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Calculate function length in lines
                    start_line = node.lineno
                    end_line = 0
                    for child in ast.walk(node):
                        if hasattr(child, 'lineno'):
                            end_line = max(end_line, child.lineno)
                    
                    functions.append({
                        'name': node.name,
                        'start_line': start_line,
                        'end_line': end_line,
                        'lines': (end_line - start_line + 1)
                    })
        except SyntaxError:
            # Skip files with syntax errors
            pass
    elif filepath.endswith(('.js', '.jsx', '.ts', '.tsx')):
        # Simple regex-based approach for JavaScript/TypeScript
        # More accurate parsing would require a proper JS/TS parser
        function_patterns = [
            r'function\s+([a-zA-Z_$][\w$]*)\s*\(',  # function declarations
            r'const\s+([a-zA-Z_$][\w$]*)\s*=\s*function\s*\(',  # function expressions
            r'const\s+([a-zA-Z_$][\w$]*)\s*=\s*\(',  # arrow functions
            r'([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*{',  # method definitions
        ]
        
        lines = content.split('\n')
        for pattern in function_patterns:
            for i, line in enumerate(lines):
                matches = re.finditer(pattern, line)
                for match in matches:
                    # Estimate function length by looking for closing braces
                    # This is a simplification and won't work for all cases
                    start_line = i + 1
                    brace_count = line[match.end():].count('{') - line[match.end():].count('}')
                    end_line = start_line
                    for j in range(i + 1, len(lines)):
                        brace_count += lines[j].count('{') - lines[j].count('}')
                        if brace_count <= 0:
                            end_line = j + 1
                            break
                    
                    func_name = match.group(1) if match.groups() else "anonymous"
                    functions.append({
                        'name': func_name,
                        'start_line': start_line,
                        'end_line': end_line,
                        'lines': (end_line - start_line + 1)
                    })
    
    return functions

def count_comment_lines(filepath, content):
    """Count comment lines in a file"""
    comment_count = 0
    
    if filepath.endswith('.py'):
        # Count Python comments (# and docstrings)
        lines = content.split('\n')
        in_multiline = False
        for line in lines:
            line = line.strip()
            if line.startswith('#'):
                comment_count += 1
            elif '"""' in line or "'''" in line:
                comment_count += 1
                # Toggle multiline comment state
                if line.count('"""') % 2 == 1 or line.count("'''") % 2 == 1:
                    in_multiline = not in_multiline
            elif in_multiline:
                comment_count += 1
    
    elif filepath.endswith(('.js', '.jsx', '.ts', '.tsx')):
        # Count JS/TS comments (// and /* */)
        lines = content.split('\n')
        in_multiline = False
        for line in lines:
            line = line.strip()
            if in_multiline:
                comment_count += 1
                if '*/' in line:
                    in_multiline = False
            elif line.startswith('//'):
                comment_count += 1
            elif '/*' in line:
                comment_count += 1
                if '*/' not in line[line.find('/*') + 2:]:
                    in_multiline = True
    
    return comment_count

def check_naming_conventions(filepath, content):
    """Check naming conventions in the file"""
    issues = []
    
    # Define convention patterns based on file type
    if filepath.endswith('.py'):
        # Check Python conventions (PEP8)
        # Class names should be CamelCase
        class_pattern = r'class\s+([a-zA-Z_$][\w$]*)'
        class_matches = re.finditer(class_pattern, content)
        for match in class_matches:
            class_name = match.group(1)
            if not re.match(r'^[A-Z][a-zA-Z0-9]*$', class_name):
                issues.append(f"Class '{class_name}' should use CamelCase")
        
        # Function/variable names should be snake_case
        func_pattern = r'def\s+([a-zA-Z_$][\w$]*)'
        func_matches = re.finditer(func_pattern, content)
        for match in func_matches:
            func_name = match.group(1)
            if not re.match(r'^[a-z][a-z0-9_]*$', func_name) and not func_name.startswith('__'):
                issues.append(f"Function '{func_name}' should use snake_case")
    
    elif filepath.endswith(('.ts', '.tsx')):
        # Check TypeScript interfaces and types (PascalCase)
        interface_pattern = r'(interface|type)\s+([a-zA-Z_$][\w$]*)'
        interface_matches = re.finditer(interface_pattern, content)
        for match in interface_matches:
            type_name = match.group(2)
            if not re.match(r'^[A-Z][a-zA-Z0-9]*$', type_name):
                issues.append(f"Interface/Type '{type_name}' should use PascalCase")
    
    elif filepath.endswith(('.js', '.jsx', '.ts', '.tsx')):
        # Check React component naming (PascalCase)
        component_pattern = r'function\s+([A-Z][a-zA-Z0-9]*)\s*\([^)]*\)\s*{'
        component_matches = re.finditer(component_pattern, content)
        for match in component_matches:
            component_name = match.group(1)
            if not re.match(r'^[A-Z][a-zA-Z0-9]*$', component_name):
                issues.append(f"Component '{component_name}' should use PascalCase")
        
        # Check for camelCase variables
        const_pattern = r'(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*='
        const_matches = re.finditer(const_pattern, content)
        for match in re.finditer(const_pattern, content):
            var_name = match.group(2)
            # Variable should be camelCase unless it's a component (PascalCase) or constant (UPPER_CASE)
            if (not re.match(r'^[a-z][a-zA-Z0-9]*$', var_name) and 
                not re.match(r'^[A-Z][a-zA-Z0-9]*$', var_name) and 
                not re.match(r'^[A-Z][A-Z0-9_]*$', var_name)):
                issues.append(f"Variable '{var_name}' should use camelCase, PascalCase, or UPPER_CASE")
    
    return issues

router = APIRouter()

class FileHealthMetric(BaseModel):
    filepath: str
    size_score: int  # 0-100, higher is better
    complexity_score: int # 0-100, higher is better
    duplication_score: int = 100  # 0-100, higher is better
    function_length_score: int = 100  # 0-100, higher is better
    comment_density_score: int = 100  # 0-100, higher is better
    naming_convention_score: int = 100  # 0-100, higher is better
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

# File and directory scanning utilities from standalone implementation
class FileNode(BaseModel):
    name: str
    path: str
    type: str  # 'file' or 'directory'
    size: int  # size in bytes for files
    last_modified: Optional[float] = None  # timestamp
    children: Optional[List[Any]] = None  # List of FileNode
    imports: Optional[List[Dict[str, str]]] = None  # List of import info objects

# Function to get file extension
def get_file_extension(file_path):
    _, ext = os.path.splitext(file_path)
    return ext.lower()[1:] if ext else ""  # Remove the dot

# Function to extract imports from a file with better metadata
def extract_imports(file_path, content, root_path="/app"):
    imports = []
    ext = get_file_extension(file_path)
    
    if ext in ['js', 'jsx', 'ts', 'tsx']:
        # JavaScript/TypeScript import regex patterns
        import_patterns = [
            # import X from 'Y'
            (r'import\s+.*?\s+from\s+[\'"](.*?)[\'"]', 'module'),
            # import 'Y'
            (r'import\s+[\'"](.*?)[\'"]', 'direct'),
            # require('Y')
            (r'require\s*?\(\s*[\'"](.*?)[\'"]', 'require'),
        ]
        
        for pattern, import_type in import_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                import_path = match[0] if isinstance(match, tuple) else match
                if import_path:
                    imports.append({'path': import_path, 'type': import_type})
    
    elif ext == 'py':
        # Python import regex patterns
        import_patterns = [
            # import X
            (r'import\s+([\w\.]+)', 'module'),
            # from X import ...
            (r'from\s+([\w\.]+)\s+import', 'from'),
        ]
        
        for pattern, import_type in import_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                if match:
                    imports.append({'path': match, 'type': import_type})
    
    return imports

def scan_directory(base_path, current_path="", max_depth=5):
    """Recursively scan a directory and build a file tree structure"""
    if max_depth <= 0:
        return None
    
    full_path = os.path.join(base_path, current_path)
    if not os.path.exists(full_path):
        return None
    
    # Get the actual name - handle special cases for API directories
    name = os.path.basename(current_path) or os.path.basename(base_path)
    
    # Special handling for API directories: If this is an API directory with __init__.py,
    # use the directory name as the name instead of the file
    if name == '__init__.py' and '/apis/' in current_path:
        # Extract the API name from the path
        api_dir = os.path.dirname(current_path)
        name = os.path.basename(api_dir) + '.py'  # Append .py to clearly show it's a Python file
    
    # Skip directories that are likely to cause performance issues
    excluded_dirs = ['.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.next', '.idea']
    if name in excluded_dirs:
        return FileNode(
            name=name,
            path=current_path or "/",
            type="directory",
            size=0,
            children=[],
            last_modified=os.path.getmtime(full_path) if os.path.exists(full_path) else None
        )
    
    # For directories
    if os.path.isdir(full_path):
        children = []
        total_size = 0
        
        try:
            items = os.listdir(full_path)
            # Limit the number of items to scan to prevent excessive processing
            max_items = 100
            if len(items) > max_items:
                items = items[:max_items]
                
            for item in items:
                item_path = os.path.join(current_path, item)
                child_node = scan_directory(base_path, item_path, max_depth - 1)
                if child_node:
                    children.append(child_node)
                    if child_node.size:
                        total_size += child_node.size
        except PermissionError:
            # Skip directories we can't access
            pass
        
        return FileNode(
            name=name,
            path=current_path or "/",
            type="directory",
            size=total_size,
            children=children,
            last_modified=os.path.getmtime(full_path) if os.path.exists(full_path) else None
        )
    
    # For files
    else:
        try:
            size = os.path.getsize(full_path)
            last_modified = os.path.getmtime(full_path)
            
            # Read file contents for import extraction (if appropriate file type)
            imports = []
            if get_file_extension(full_path) in ['js', 'jsx', 'ts', 'tsx', 'py']:
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        imports = extract_imports(current_path, content, base_path)
                except Exception as e:
                    # Skip files we can't read
                    print(f"Error reading {full_path}: {str(e)}")
                    pass
            
            return FileNode(
                name=name,
                path=current_path,
                type="file",
                size=size,
                last_modified=last_modified,
                imports=imports
            )
        except (PermissionError, FileNotFoundError):
            # Skip files we can't access
            return None

def scan_codebase_structure():
    """Scan the codebase structure without relying on the codebase API"""
    try:
        # Use the current directory as the base path
        base_path = "/app"  # Assuming /app is the root of the project
        
        # Create the structure with key app areas
        structure = FileNode(
            name="App",
            path="/",
            type="directory",
            size=0,
            children=[]
        )
        
        # Define categories to scan
        categories = {
            "Pages": "/ui/src/pages",
            "UI Components": "/ui/src/components",
            "UI Files": "/ui/src/utils",
            "APIs": "/src/app/apis"
        }
        
        # Scan each category
        for name, rel_path in categories.items():
            # Remove leading slash for joining with base_path
            path = rel_path[1:] if rel_path.startswith('/') else rel_path
            dir_path = os.path.join(base_path, path)
            
            if os.path.exists(dir_path) and os.path.isdir(dir_path):
                category_node = FileNode(
                    name=name,
                    path=rel_path,
                    type="directory",
                    size=0,
                    children=[]
                )
                
                # Scan the directory
                node = scan_directory(base_path, path)
                if node and node.children:
                    category_node.children = node.children
                    category_node.size = node.size
                    structure.children.append(category_node)
        
        return structure
    except Exception as e:
        print(f"Error scanning codebase structure: {str(e)}")
        return None

@router.get("/analyze", tags=["noauth"])
def analyze_code_health():
    """Analyze the codebase health and return metrics and recommendations"""
    # Get the codebase structure using our own standalone implementation
    codebase_structure = scan_codebase_structure()
    if not codebase_structure:
        raise HTTPException(status_code=500, detail="Failed to scan codebase structure")
    
    # Convert to the expected format for analysis
    codebase = type('CodebaseDummy', (), {'structure': codebase_structure})()

    
    # Initialize health metrics
    component_metrics = []
    all_issues = []
    
    # Get pages health
    if codebase and hasattr(codebase, 'structure') and codebase.structure.children:
        for section in codebase.structure.children:
            # Process each section (Pages, UI Components, etc.)
            if section.name == "Pages":
                pages_metrics = analyze_section(section, "page")
                component_metrics.append(
                    ComponentHealthMetric(
                        name="Pages",
                        files=pages_metrics["files"],
                        score=pages_metrics["score"],
                        issues=pages_metrics["issues"]
                    )
                )
                all_issues.extend(pages_metrics["issues"])
            
            # Process UI Components
            elif section.name == "UI Components":
                components_metrics = analyze_section(section, "component")
                component_metrics.append(
                    ComponentHealthMetric(
                        name="UI Components",
                        files=components_metrics["files"],
                        score=components_metrics["score"],
                        issues=components_metrics["issues"]
                    )
                )
                all_issues.extend(components_metrics["issues"])
            
            # Process API files
            elif section.name == "APIs":
                api_metrics = analyze_section(section, "api")
                component_metrics.append(
                    ComponentHealthMetric(
                        name="APIs",
                        files=api_metrics["files"],
                        score=api_metrics["score"],
                        issues=api_metrics["issues"]
                    )
                )
                all_issues.extend(api_metrics["issues"])
            
            # Process UI Files (utils)
            elif section.name == "UI Files":
                utils_metrics = analyze_section(section, "util")
                component_metrics.append(
                    ComponentHealthMetric(
                        name="UI Files",
                        files=utils_metrics["files"],
                        score=utils_metrics["score"],
                        issues=utils_metrics["issues"]
                    )
                )
                all_issues.extend(utils_metrics["issues"])
    
    # Calculate overall score based on component scores
    overall_score = 0
    if component_metrics:
        overall_score = sum(component.score for component in component_metrics) // len(component_metrics)
    
    # Generate recommendations based on issues
    recommendations = generate_recommendations(all_issues)
    
    # Create and return response
    response = CodeHealthResponse(
        overall_score=overall_score,
        components=component_metrics,
        recommendations=recommendations
    )
    
    # Store the health check results for historical comparison
    store_health_check_results(response)
    
    return response

def analyze_section(section, section_type):
    """Analyze a section of the codebase (Pages, Components, APIs, etc.)"""
    file_metrics = []
    section_issues = []
    total_score = 0
    
    # First pass: collect file contents for duplication analysis
    file_contents = {}
    code_blocks = []
    
    if section.children:
        for file_node in section.children:
            if file_node.type == "file":
                try:
                    with open(f"/app/{file_node.path}", 'r', encoding='utf-8') as f:
                        content = f.read()
                        file_contents[file_node.path] = content
                        
                        # Extract code blocks (minimum 3 lines) for duplication detection
                        lines = content.split('\n')
                        for i in range(len(lines) - 2):  # Need at least 3 lines for a block
                            block = '\n'.join(lines[i:i+3])
                            # Simple hash-based approach for demo purposes
                            block_hash = hashlib.md5(block.encode()).hexdigest()
                            code_blocks.append({
                                'file': file_node.path,
                                'start_line': i + 1,
                                'block': block,
                                'hash': block_hash
                            })
                except Exception as e:
                    print(f"Error reading file {file_node.path}: {str(e)}")
    
    # Find duplicated blocks
    duplicate_blocks = defaultdict(list)
    for block in code_blocks:
        duplicate_blocks[block['hash']].append(block)
    
    # Filter to only blocks that appear more than once
    duplications = {h: blocks for h, blocks in duplicate_blocks.items() if len(blocks) > 1}
    
    # Store duplication info per file
    file_duplications = defaultdict(int)
    for blocks in duplications.values():
        for block in blocks:
            file_duplications[block['file']] += 1
    
    # Second pass: detailed analysis
    if section.children:
        for file_node in section.children:
            if file_node.type == "file":
                # Check file size health
                size_score = 100
                file_issues = []
                
                # Penalize large files
                if file_node.size > 10000:  # 10KB
                    size_score = 50
                    file_issues.append(f"Large file size ({file_node.size // 1000}KB)")
                elif file_node.size > 20000:  # 20KB
                    size_score = 25
                    file_issues.append(f"Very large file size ({file_node.size // 1000}KB)")
                
                # Check complexity based on imports count
                complexity_score = 100
                if hasattr(file_node, 'imports') and file_node.imports:
                    import_count = len(file_node.imports)
                    if import_count > 15:
                        complexity_score = 50
                        file_issues.append(f"High import count ({import_count} imports)")
                    elif import_count > 25:
                        complexity_score = 25
                        file_issues.append(f"Very high import count ({import_count} imports)")
                
                # Initialize additional scores
                duplication_score = 100
                function_length_score = 100
                comment_density_score = 100
                naming_convention_score = 100
                
                # 1. Check duplication
                dup_count = file_duplications.get(file_node.path, 0)
                if dup_count > 0:
                    # Scale score based on number of duplicated blocks
                    if dup_count > 10:
                        duplication_score = 0
                        file_issues.append(f"Severe code duplication ({dup_count} blocks)")
                    elif dup_count > 5:
                        duplication_score = 50
                        file_issues.append(f"Moderate code duplication ({dup_count} blocks)")
                    else:
                        duplication_score = 75
                        file_issues.append(f"Minor code duplication ({dup_count} blocks)")
                
                # Only analyze additional metrics if we have file contents
                if file_node.path in file_contents:
                    content = file_contents[file_node.path]
                    
                    # 2. Function length analysis
                    if file_node.path.endswith(('.js', '.jsx', '.ts', '.tsx', '.py')):
                        try:
                            function_info = extract_function_info(file_node.path, content)
                            long_functions = [f for f in function_info if f['lines'] > 30]
                            very_long_functions = [f for f in function_info if f['lines'] > 50]
                            
                            if very_long_functions:
                                function_length_score = 25
                                file_issues.append(f"Very long functions found ({len(very_long_functions)} functions > 50 lines)")
                            elif long_functions:
                                function_length_score = 50
                                file_issues.append(f"Long functions found ({len(long_functions)} functions > 30 lines)")
                        except Exception as e:
                            print(f"Error analyzing functions in {file_node.path}: {str(e)}")
                    
                    # 3. Comment density analysis
                    try:
                        comment_lines = count_comment_lines(file_node.path, content)
                        code_lines = len(content.split('\n'))
                        if code_lines > 0:
                            comment_ratio = comment_lines / code_lines
                            if comment_ratio < 0.05 and code_lines > 50:  # Less than 5% comments in substantial files
                                comment_density_score = 50
                                file_issues.append(f"Low comment density ({comment_lines} comments, {int(comment_ratio*100)}%)")
                            elif comment_ratio < 0.02 and code_lines > 50:  # Almost no comments
                                comment_density_score = 25
                                file_issues.append(f"Very low comment density ({comment_lines} comments, {int(comment_ratio*100)}%)")
                    except Exception as e:
                        print(f"Error analyzing comments in {file_node.path}: {str(e)}")
                    
                    # 4. Naming convention analysis
                    try:
                        naming_issues = check_naming_conventions(file_node.path, content)
                        if len(naming_issues) > 5:
                            naming_convention_score = 25
                            file_issues.append(f"Multiple naming convention issues ({len(naming_issues)} issues)")
                        elif len(naming_issues) > 0:
                            naming_convention_score = 50
                            file_issues.append(f"Some naming convention issues ({len(naming_issues)} issues)")
                    except Exception as e:
                        print(f"Error analyzing naming in {file_node.path}: {str(e)}")
                
                # Add file-specific checks based on section type
                if section_type == "page":
                    # Check for page-specific issues (like SEO, etc)
                    pass
                elif section_type == "component":
                    # Check for component-specific issues (like prop drilling)
                    pass
                elif section_type == "api":
                    # Check for API-specific issues (like error handling)
                    pass
                
                # Add file metric - now with additional metrics
                file_metric = FileHealthMetric(
                    filepath=file_node.path,
                    size_score=size_score,
                    complexity_score=complexity_score,
                    duplication_score=duplication_score,
                    function_length_score=function_length_score,
                    comment_density_score=comment_density_score,
                    naming_convention_score=naming_convention_score,
                    issues=file_issues
                )
                file_metrics.append(file_metric)
                
                # Add file issues to section issues if any
                if file_issues:
                    section_issues.append(f"{file_node.path}: {', '.join(file_issues)}")
                
                # Calculate composite score from all metrics
                file_score = (
                    size_score + 
                    complexity_score + 
                    duplication_score + 
                    function_length_score + 
                    comment_density_score + 
                    naming_convention_score
                ) // 6  # Average of all scores
                
                total_score += file_score
    
    # Calculate average score for the section
    section_score = 0
    if file_metrics:
        section_score = total_score // len(file_metrics)
    
    return {
        "files": file_metrics,
        "score": section_score,
        "issues": section_issues
    }

def generate_recommendations(issues):
    """Generate actionable recommendations based on identified issues"""
    recommendations = []
    
    # Check for large file issues
    large_files = [issue for issue in issues if "large file size" in issue.lower()]
    if large_files:
        recommendations.append("Consider breaking down large files into smaller, more focused components")
    
    # Check for high import count issues
    high_imports = [issue for issue in issues if "high import count" in issue.lower()]
    if high_imports:
        recommendations.append("Reduce import dependencies by consolidating related functionality")
    
    # Check for duplication issues
    duplication_issues = [issue for issue in issues if "code duplication" in issue.lower()]
    if duplication_issues:
        recommendations.append("Refactor duplicated code into reusable functions or components")
    
    # Check for function length issues
    function_issues = [issue for issue in issues if "function" in issue.lower() and "lines" in issue.lower()]
    if function_issues:
        recommendations.append("Break down long functions into smaller, single-responsibility functions")
    
    # Check for comment density issues
    comment_issues = [issue for issue in issues if "comment density" in issue.lower()]
    if comment_issues:
        recommendations.append("Improve code documentation with more meaningful comments for complex logic")
    
    # Check for naming convention issues
    naming_issues = [issue for issue in issues if "naming convention" in issue.lower()]
    if naming_issues:
        recommendations.append("Standardize naming conventions across the codebase for better readability")
    
    # Add general recommendations
    recommendations.append("Regularly review and refactor complex components")
    recommendations.append("Maintain consistent file organization and naming conventions")
    
    return recommendations

def store_health_check_results(results):
    """Store health check results for historical tracking"""
    try:
        # Get existing history or create new
        history = db.storage.json.get("code-health-history", default=[])
        
        # Add timestamp to results
        timestamped_results = {
            "timestamp": time.time(),
            "date": datetime.now().isoformat(),
            "results": results.dict()
        }
        
        # Add to history and keep only last 10 checks
        history.append(timestamped_results)
        if len(history) > 10:
            history = history[-10:]
        
        # Store updated history
        db.storage.json.put("code-health-history", history)
    except Exception as e:
        print(f"Error storing health check history: {str(e)}")

@router.get("/health-history", tags=["noauth"])
def get_health_check_history():
    """Get historical code health metrics"""
    try:
        # Retrieve health check history
        history = db.storage.json.get("code-health-history", default=[])
        return history
    except Exception as e:
        return {"error": f"Error retrieving health check history: {str(e)}"}

@router.get("/firestore-analysis", tags=["noauth"])
def analyze_firestore_usage():
    """Analyze Firestore collection and document usage in the codebase"""
    # Use our standalone implementation instead of relying on codebase API
    codebase_structure = scan_codebase_structure()
    if not codebase_structure:
        raise HTTPException(status_code=500, detail="Failed to scan codebase structure")
    
    # Convert to expected format
    codebase = type('CodebaseDummy', (), {'structure': codebase_structure})()
    
    # Track Firestore collections and their usage
    collections = {}
    collection_patterns = [
        r"collection\(db,\s*['\"](.+?)['\"]\)",  # collection(db, 'users')
        r"COLLECTIONS\.(\w+)"  # COLLECTIONS.USERS
    ]
    
    # Firestore operations to track
    operations = ['getDocs', 'getDoc', 'setDoc', 'updateDoc', 'deleteDoc', 'addDoc']
    operation_usage = {op: [] for op in operations}
    
    # Process all files
    if codebase and hasattr(codebase, 'structure'):
        files = extract_all_files(codebase.structure)
        
        for file_node in files:
            if file_node.path.endswith(('.ts', '.tsx', '.js', '.jsx')):
                try:
                    # Get file content
                    with open(f"/app/{file_node.path}", 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Find collection references
                        for pattern in collection_patterns:
                            matches = re.findall(pattern, content)
                            for match in matches:
                                if match not in collections:
                                    collections[match] = []
                                collections[match].append(file_node.path)
                        
                        # Find operation usage
                        for operation in operations:
                            if operation in content:
                                operation_usage[operation].append(file_node.path)
                except Exception as e:
                    print(f"Error processing file {file_node.path}: {str(e)}")
    
    # Analyze usage patterns
    collection_analysis = {
        "collections": collections,
        "operations": operation_usage,
        "recommendations": []
    }
    
    # Generate Firestore-specific recommendations
    if collections:
        collection_analysis["recommendations"].append(
            "Ensure consistent collection naming and access patterns across the codebase"
        )
    
    # Check for potential missing security rules
    if operation_usage.get('setDoc', []) or operation_usage.get('updateDoc', []) or operation_usage.get('deleteDoc', []):
        collection_analysis["recommendations"].append(
            "Verify Firestore security rules are properly configured for write operations"
        )
    
    return collection_analysis

def extract_all_files(node):
    """Extract all file nodes from the codebase structure"""
    files = []
    
    if hasattr(node, 'type') and node.type == "file":
        files.append(node)
    elif hasattr(node, 'children') and node.children:
        for child in node.children:
            files.extend(extract_all_files(child))
    
    return files