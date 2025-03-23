import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle, CheckCircle2, Code, Copy, File, FileText, Gauge, GitBranch, HelpCircle, Info as InfoIcon, Lightbulb, MessageSquare, Minus, RefreshCw, Shield, SplitSquareVertical, Tag as TagIcon, AlertCircle, AlertOctagon } from "lucide-react";
import brain from "brain";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

// ====== INLINE COMPONENTS ======

// SparklineChart Component for mini trend visualization
interface SparklineChartProps {
  data: number[];
  height?: number;
  width?: number;
  lineColor?: string;
  dotColor?: string;
  highlightLatest?: boolean;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  height = 40,
  width = 120,
  lineColor = "hsl(var(--primary))",
  dotColor = "hsl(var(--primary))",
  highlightLatest = true
}) => {
  if (!data || data.length <= 1) return null;
  
  // Create data points for recharts
  const chartData = data.map((value, index) => ({ value, index }));
  
  // Enhanced color handling for dark mode compatibility
  const getContrastColor = (baseColor: string) => {
    // Handle CSS variable colors for dark mode compatibility
    if (baseColor.includes('--destructive')) {
      return 'rgba(255, 86, 86, 0.7)'; // Light red for dark mode
    } else if (baseColor.includes('--warning')) {
      return 'rgba(255, 170, 0, 0.7)'; // Light amber for dark mode
    } else if (baseColor.includes('--success')) {
      return 'rgba(74, 222, 128, 0.7)'; // Light green for dark mode
    } else if (baseColor.includes('rgba(var(')) {
      // For rgba CSS variables, increase opacity for visibility
      return baseColor.replace(/\d\.\d\)$/, '0.9)');
    } else {
      // Default fallback - use a visible light color
      return 'rgba(255, 255, 255, 0.7)';
    }
  };

  // Apply enhanced colors
  const finalLineColor = getContrastColor(lineColor);
  const finalDotColor = getContrastColor(dotColor);
  
  return (
    <div className="inline-flex" style={{ width, height }}>
      <LineChart 
        width={width} 
        height={height} 
        data={chartData} 
        margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
      >
        <Line 
          type="monotone" 
          dataKey="value"
          stroke={finalLineColor}
          strokeWidth={1.5}
          dot={{ r: 1, fill: finalDotColor, strokeWidth: 0 }}
          activeDot={false}
          isAnimationActive={false}
        />
        {highlightLatest && (
          <Line 
            type="monotone" 
            dataKey="value"
            stroke="transparent"
            strokeWidth={0}
            dot={(props) => {
              const { cx, cy, index } = props;
              if (index === data.length - 1) {
                return (
                  <circle 
                    key={`dot-${index}`}
                    cx={cx} 
                    cy={cy} 
                    r={3} 
                    fill={finalDotColor} 
                  />
                );
              }
              return null;
            }}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </div>
  );
};

// MetricInfoCard Component
interface MetricInfoCardProps {
  title: string;
  description: string;
  whatItMeans: string;
  whyItMatters: string;
  consequences: string;
  score?: number;
  variant?: "default" | "compact";
}

const MetricInfoCard: React.FC<MetricInfoCardProps> = ({
  title,
  description,
  whatItMeans,
  whyItMatters,
  consequences,
  score,
  variant = "default",
}) => {
  return (
    <Card className={variant === "compact" ? "p-3" : "p-4"}>
      <CardHeader className={variant === "compact" ? "p-0 pb-2" : "px-0 pb-2"}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={variant === "compact" ? "text-base" : "text-lg"}>{title}</CardTitle>
            {score !== undefined && (
              <Badge variant={getBadgeVariant(score)} className={`mr-2 
                ${score < 70 ? 'bg-destructive/10 dark:bg-destructive/20 dark:border-destructive/30 dark:text-destructive-foreground' : ''}
                ${score >= 70 && score < 85 ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400' : ''}
                ${score >= 85 ? 'bg-success/20 text-success-700 dark:bg-success/20 dark:border-success/30 dark:text-green-400' : ''}
              `}>
                {score}/100
              </Badge>
            )}
            <CardDescription>{description}</CardDescription>
          </div>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className={variant === "compact" ? "p-0" : "px-0"}>
        <div className="space-y-2">
          {whatItMeans && (
            <div>
              <h4 className="text-sm font-semibold mb-1">What it means:</h4>
              <p className="text-sm text-muted-foreground">{whatItMeans}</p>
            </div>
          )}
          {whyItMatters && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Why it matters:</h4>
              <p className="text-sm text-muted-foreground">{whyItMatters}</p>
            </div>
          )}
          {consequences && (
            <div>
              <h4 className="text-sm font-semibold mb-1">If ignored:</h4>
              <p className="text-sm text-muted-foreground">{consequences}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Best Practices Component
const CodeHealthBestPractices: React.FC = () => {
  const bestPractices = [
    {
      id: "size",
      title: "File Size Best Practices",
      practices: [
        "Split large files into smaller, focused modules",
        "Separate concerns: data, logic, and presentation",
        "Move reusable code into utility functions",
        "Consider creating new components for complex UI elements"
      ],
      example: `// Instead of one large file\n// userDashboard.tsx (2000+ lines)\n\n// Split into multiple files:\n// UserProfile.tsx\nexport const UserProfile = () => { ... }\n\n// UserSettings.tsx\nexport const UserSettings = () => { ... }`,
      impact: "Large files are harder to understand, debug, and maintain. They often violate the Single Responsibility Principle."
    },
    {
      id: "complexity",
      title: "Complexity Best Practices",
      practices: [
        "Break complex logic into smaller, more manageable functions",
        "Use early returns to reduce nesting",
        "Simplify conditional logic when possible",
        "Consider using helper functions for repetitive operations"
      ],
      example: `// Instead of:\nfunction processData(data) {\n  if (data) {\n    if (data.items) {\n      if (data.items.length > 0) {\n        // complex logic here\n      }\n    }\n  }\n}\n\n// Better approach:\nfunction processData(data) {\n  if (!data?.items?.length) return;\n  // complex logic here\n}`,
      impact: "Complex code is harder to understand, test, and modify. It's more likely to contain bugs and unexpected behavior."
    },
    {
      id: "duplication",
      title: "Duplication Best Practices",
      practices: [
        "Extract repeated code into reusable functions",
        "Create shared components for UI patterns",
        "Use utility files for common operations",
        "Consider creating hooks for reusable logic"
      ],
      example: `// Instead of repeating this pattern:\nfunction Component1() {\n  const [data, setData] = useState([]);\n  \n  useEffect(() => {\n    const fetchData = async () => {\n      try {\n        const res = await fetch('/api/data');\n        const json = await res.json();\n        setData(json);\n      } catch (err) {\n        console.error(err);\n      }\n    };\n    fetchData();\n  }, []);\n}\n\n// Create a reusable hook:\nfunction useFetchData(url) {\n  const [data, setData] = useState([]);\n  \n  useEffect(() => {\n    const fetchData = async () => {\n      try {\n        const res = await fetch(url);\n        const json = await res.json();\n        setData(json);\n      } catch (err) {\n        console.error(err);\n      }\n    };\n    fetchData();\n  }, [url]);\n  \n  return data;\n}`,
      impact: "Duplicated code increases maintenance burden as changes need to be made in multiple places. It also increases file size and complexity."
    },
    {
      id: "function-length",
      title: "Function Length Best Practices",
      practices: [
        "Limit functions to 20-30 lines when possible",
        "Decompose long functions into smaller, focused ones",
        "Extract helper functions for specialized tasks",
        "Consider breaking complex functions into steps"
      ],
      example: `// Instead of one long function:\nfunction processAndDisplayUserData(userId) {\n  // 50+ lines of code that:\n  // 1. Fetches user data\n  // 2. Processes user data\n  // 3. Updates the UI\n  // 4. Handles errors\n  // 5. Logs activity\n}\n\n// Break it down:\nfunction processAndDisplayUserData(userId) {\n  try {\n    const userData = fetchUserData(userId);\n    const processedData = processUserData(userData);\n    updateUserInterface(processedData);\n    logUserActivity(userId, 'data_viewed');\n  } catch (error) {\n    handleDataError(error);\n  }\n}`,
      impact: "Long functions are difficult to understand and test. They often perform multiple tasks and violate the Single Responsibility Principle, making maintenance harder."
    },
    {
      id: "comment-density",
      title: "Comment Density Best Practices",
      practices: [
        "Add comments explaining 'why' rather than 'what' the code does",
        "Document public functions, parameters, and return values",
        "Add context for complex algorithms or business logic",
        "Update comments when code changes"
      ],
      example: `// Bad: Comment states the obvious\n// Sets user name\nuser.name = 'John';\n\n// Good: Comment explains reasoning\n// Using display name instead of legal name for privacy reasons\nuser.displayName = 'John';\n\n// Good: JSDoc for public functions\n/**\n * Calculates total price including applicable taxes and discounts\n * @param {number} basePrice - Base product price\n * @param {number} taxRate - Current tax rate (0-1)\n * @param {Discount[]} discounts - List of applicable discounts\n * @returns {number} Total final price\n */\nfunction calculateTotalPrice(basePrice, taxRate, discounts) { ... }`,
      impact: "Poorly commented code becomes incomprehensible over time, especially when the original developers leave. Well-documented code enables easier maintenance, onboarding, and collaboration."
    },
    {
      id: "naming-convention",
      title: "Naming Convention Best Practices",
      practices: [
        "Use descriptive, intention-revealing names",
        "Follow consistent naming conventions (camelCase, PascalCase, etc.)",
        "Avoid abbreviations and acronyms unless widely understood",
        "Name components, variables, and functions based on their purpose, not implementation"
      ],
      example: `// Poor naming\nconst d = new Date();\nconst fn = (a, b) => a + b;\nconst arr = ['apple', 'banana', 'cherry'];\n\n// Better naming\nconst currentDate = new Date();\nconst calculateSum = (firstNumber, secondNumber) => firstNumber + secondNumber;\nconst fruitList = ['apple', 'banana', 'cherry'];\n\n// Poor component naming\nfunction Thing() { ... } // What thing?\n\n// Better component naming\nfunction UserProfileCard() { ... } // Clear purpose`,
      impact: "Poor naming requires developers to mentally translate variables and functions, increasing cognitive load. Good naming makes code self-documenting and reduces the need for excessive comments."
    }
  ];

  return (
    <Accordion type="single" collapsible className="w-full">
      {bestPractices.map((practice) => (
        <AccordionItem key={practice.id} value={practice.id}>
          <AccordionTrigger className="hover:no-underline text-left">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <span>{practice.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <ul className="space-y-1">
                {practice.practices.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-muted/70 p-3 rounded-md font-mono text-sm overflow-x-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Example:</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap">{practice.example}</pre>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

// FileHealthIndicator Component
interface FileHealthIndicatorProps {
  score: number;
  issueCount: number;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

const FileHealthIndicator: React.FC<FileHealthIndicatorProps> = ({
  score,
  issueCount,
  showTooltip = true,
  size = "md",
}) => {
  // Determine severity based on score
  const getSeverity = () => {
    if (score < 70) return "critical";
    if (score < 85) return "warning";
    return "good";
  };

  const severity = getSeverity();

  // Size classes
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  // Icon based on severity
  const Icon = severity === "critical" 
    ? AlertTriangle 
    : severity === "warning" 
      ? AlertTriangle 
      : CheckCircle;

  // Color based on severity
  const colorClass = severity === "critical" 
    ? "text-destructive" 
    : severity === "warning" 
      ? "text-warning" 
      : "text-success";

  // Messages based on severity and issue count
  const getMessage = () => {
    if (severity === "critical") {
      return `Critical issues detected (${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}). This file needs immediate attention.`;
    } else if (severity === "warning") {
      return `Potential issues detected (${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}). Consider reviewing this file soon.`;
    } else {
      return issueCount === 0 
        ? "No issues detected. This file follows best practices." 
        : `Minor improvements possible (${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}).`;
    }
  };

  const content = (
    <Icon className={`${sizeClasses[size]} ${colorClass}`} />
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help inline-flex">
            {content}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-1">
            <div className="font-medium">
              Health Score: {score}/100
            </div>
            <div className="text-sm text-muted-foreground">
              {getMessage()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ====== MAIN APP INTERFACES ======

interface HealthHistoryEntry {
  timestamp: number;
  date: string;
  results: {
    overall_score: number;
    components: {
      name: string;
      score: number;
      files: {
        filepath: string;
        size_score: number;
        complexity_score: number;
        duplication_score: number;
        function_length_score: number;
        comment_density_score: number;
        naming_convention_score: number;
        issues: string[];
      }[];
      issues: string[];
    }[];
    recommendations: string[];
  };
}

// Helper function to get score color
const getScoreColor = (score: number) => {
  if (score < 70) return "text-destructive";
  if (score < 85) return "text-warning";
  return "text-success";
};

// Helper function to get badge color
const getBadgeVariant = (score: number): "destructive" | "warning" | "success" | "outline" => {
  if (score < 70) return "destructive";
  if (score < 85) return "warning";
  return "success";
};

// Helper function to get background color
const getBgClass = (score: number) => {
  if (score < 70) return "bg-destructive/10";
  if (score < 85) return "bg-warning/10";
  return "bg-success/10";
};

// Helper function to calculate average file score
const calculateFileAvgScore = (file: any) => {
  const scores = [
    file.size_score || 0,
    file.complexity_score || 0, 
    file.duplication_score || 0,
    file.function_length_score || 0, 
    file.comment_density_score || 0,
    file.naming_convention_score || 0
  ];

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

// Helper function to categorize files by path
const categorizeFileByPath = (filepath: string): string => {
  // Strip leading slashes for consistent matching
  const normalizedPath = filepath.replace(/^\/+/, '');

  console.log(`Categorizing path: ${normalizedPath}`);

  // Check for API files first (multiple patterns)
  if (
    normalizedPath.includes('app/apis/') || 
    normalizedPath.includes('src/app/apis/') ||
    normalizedPath.includes('apis/') ||
    normalizedPath.match(/apis\/[^\/]+\/__init__.py/) ||
    normalizedPath.match(/apis\/[^\/]+\/.*\.py/) ||
    normalizedPath.match(/api\/[^\/]+/) ||
    normalizedPath.includes('/api/')
  ) {
    console.log(`Identified API file: ${normalizedPath}`);
    return "API Files";
  }

  // Then check other categories
  if (normalizedPath.includes('/pages/')) {
    return "Pages";
  } else if (normalizedPath.includes('/components/')) {
    return "Components";
  } else if (normalizedPath.includes('/utils/') || normalizedPath.includes('/src/utils/')) {
    return "UI Files";
  } else {
    return "Other";
  }
};;

const CodeHealth: React.FC = () => {
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [selectedComponent, setSelectedComponent] = useState<string>("");
  const [showTrends] = useState<boolean>(true); // Always show trends
  const [creatingTask, setCreatingTask] = useState<boolean>(false);
  const [taskCreationSuccess, setTaskCreationSuccess] = useState<string>("");
  const [taskCreationError, setTaskCreationError] = useState<string>("");

  // Load code health history
  useEffect(() => {
    const fetchCodeHealthHistory = async () => {
      try {
        setLoading(true);
        const response = await brain.get_health_check_history();
        const data = await response.json();
        setHealthHistory(data);
      } catch (err) {
        console.error("Error fetching code health history:", err);
        setError("Failed to load code health history data");
      } finally {
        setLoading(false);
      }
    };

    fetchCodeHealthHistory();
  }, []);

  // Copy fix prompt to clipboard for the agent to use
  const createFixTask = async (file: any) => {
    try {
      setCreatingTask(true);
      
      // Extract critical issues
      const criticalIssue = file.issues.find((issue: string) => 
        issue.toLowerCase().includes('severe') || 
        issue.toLowerCase().includes('critical') ||
        issue.toLowerCase().includes('large file') ||
        issue.toLowerCase().includes('duplication')
      ) || '';
      
      // Generate recommended best practices based on issues
      const bestPractices = [];
      
      if (file.filepath.toLowerCase().includes('large file') || file.issues.some(i => i.toLowerCase().includes('large file'))) {
        bestPractices.push('- Split large files into smaller modules with focused responsibilities');
      }
      
      if (file.issues.some(i => i.toLowerCase().includes('complex'))) {
        bestPractices.push('- Break complex logic into smaller, more manageable functions');
      }
      
      if (file.issues.some(i => i.toLowerCase().includes('duplicat'))) {
        bestPractices.push('- Extract duplicated code into reusable utility functions');
      }
      
      if (file.issues.some(i => i.toLowerCase().includes('function length') || i.toLowerCase().includes('long method'))) {
        bestPractices.push('- Refactor long functions into smaller ones with single responsibilities');
      }
      
      if (file.issues.some(i => i.toLowerCase().includes('comment'))) {
        bestPractices.push('- Add clear, concise comments for complex logic');
      }
      
      if (file.issues.some(i => i.toLowerCase().includes('naming'))) {
        bestPractices.push('- Use consistent, descriptive naming conventions');
      }
      
      // Create the prompt text for fixing the file
      const promptText = `Please create a task to improve this file: ${file.filepath}

Issues that need to be fixed:
${file.issues.map((issue: string) => `- ${issue}`).join('\n')}

${bestPractices.length > 0 ? `Recommendations:\n${bestPractices.join('\n')}\n\n` : ''}When fixing this file:
- Keep existing component/function names and API contracts
- Focus on readability and maintainability
- Add appropriate comments where needed`;

      // Copy to clipboard
      await navigator.clipboard.writeText(promptText);
      
      // Set success state for this specific file
      setTaskCreationSuccess(file.filepath);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setTaskCreationSuccess('');
      }, 5000);
      
    } catch (err) {
      console.error("Error creating task:", err);
      setTaskCreationError(file.filepath);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setTaskCreationError('');
      }, 5000);
    } finally {
      setCreatingTask(false);
    }
  };

  // Run a new analysis
  const runNewAnalysis = async () => {
    try {
      setLoading(true);
      // Make API calls in sequence
      console.log("Starting code health analysis");
      const analyzeResult = await brain.analyze_code_health();
      console.log("Analysis completed, fetching history");
      const response = await brain.get_health_check_history();
      const data = await response.json();

      // Check if we have an APIs component
      const analyzeData = await analyzeResult.json();
      const hasApiComponent = analyzeData.components.some(c => c.name === "APIs");
      console.log("API component found in results:", hasApiComponent);

      // Log API files for debugging
      const apiFiles = analyzeData.components
        .filter(c => c.name === "APIs")
        .flatMap(comp => comp.files.map(file => ({
          component: comp.name,
          filepath: file.filepath,
          score: calculateFileAvgScore(file)
        })));

      console.log(`API component found:\nAPIs\nwith\n${apiFiles.length}\nfiles`);
      apiFiles.forEach(file => {
        console.log(`Identified API file:\n${file.filepath}`);
      });

      setHealthHistory(data);
      console.log("Analysis and history update completed");
    } catch (err) {
      console.error("Error running code health check:", err);
      setError("Failed to run code health analysis");
    } finally {
      setLoading(false);
    }
  };

  // Calculate score trends for files across all history entries
  const calculateFileTrends = () => {
    if (healthHistory.length <= 1) return {};

    // Create a map to track file scores across time
    const fileScores: Record<string, number[]> = {};

    // Go through all history entries to collect scores for each file
    healthHistory.forEach(entry => {
      entry.results.components.forEach(component => {
        component.files.forEach(file => {
          const filepath = file.filepath;
          const score = calculateFileAvgScore(file);

          if (!fileScores[filepath]) {
            fileScores[filepath] = [];
          }
          fileScores[filepath].push(score);
        });
      });
    });

    // Calculate trend for each file (positive, negative, or neutral)
    const fileTrends: Record<string, { trend: 'up' | 'down' | 'neutral', change: number }> = {};

    Object.keys(fileScores).forEach(filepath => {
      const scores = fileScores[filepath];
      if (scores.length > 1) {
        const firstScore = scores[0];
        const latestScore = scores[scores.length - 1];
        const change = latestScore - firstScore;

        fileTrends[filepath] = {
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
          change: change
        };
      }
    });

    return fileTrends;
  };

  // Group files by type
  const getFilesGroupedByType = () => {
    if (!healthHistory.length) return {};

    const latestEntry = healthHistory[healthHistory.length - 1];
    const previousEntry = healthHistory.length > 1 ? healthHistory[healthHistory.length - 2] : null;

    // Initialize file categories
    const allFiles: Record<string, any[]> = {
      "Pages": [],
      "Components": [],
      "UI Files": [],
      "API Files": [],
      "Other": []
    };

    // Map of previous scores by filepath
    const previousScores: Record<string, number> = {};

    if (previousEntry) {
      previousEntry.results.components.forEach(component => {
        component.files.forEach(file => {
          const avgScore = calculateFileAvgScore(file);
          previousScores[file.filepath] = avgScore;
        });
      });
    }

    // Process current files
    latestEntry.results.components.forEach(component => {
      // Debug for API component
      if (component.name === "APIs") {
        console.log("API component found:", component.name, "with", component.files.length, "files");
      }

      component.files.forEach(file => {
        const avgScore = calculateFileAvgScore(file);
        const previousScore = previousScores[file.filepath] || avgScore;
        const scoreChange = avgScore - previousScore;

        const fileInfo = {
          ...file,
          score: avgScore,
          previousScore,
          scoreChange,
          component: component.name,
          details: {
            size: file.size_score,
            complexity: file.complexity_score,
            duplication: file.duplication_score,
            function_length: file.function_length_score,
            comment_density: file.comment_density_score,
            naming_convention: file.naming_convention_score
          }
        };

        const category = categorizeFileByPath(file.filepath);
        allFiles[category].push(fileInfo);
      });
    });

    // Sort each category by score (lowest first)
    Object.keys(allFiles).forEach(key => {
      allFiles[key].sort((a, b) => a.score - b.score);
    });

    return allFiles;
  };

  // Get recommendations
  const getRecommendations = () => {
    if (!healthHistory.length) return [];
    const latestEntry = healthHistory[healthHistory.length - 1];
    return latestEntry.results.recommendations;
  };

  // This function is no longer needed as the API now calculates the true score correctly


  // Render File Metrics Card
  const renderFileMetricsCard = (file: any) => {
    // Extract filename from path
    const filename = file.filepath.split('/').pop();

    // For API __init__.py files, display the API module name instead
    const displayName = file.filepath.includes('apis/') && filename === '__init__.py'
      ? file.filepath.split('/').slice(-2, -1)[0]  // Get the API module name
      : filename;

    // Determine most critical issues
    const getMostCriticalIssue = () => {
      if (file.issues.length === 0) return null;

      // Find issues with severity keywords
      const criticalIssues = file.issues.filter((issue: string) => 
        issue.toLowerCase().includes('severe') || 
        issue.toLowerCase().includes('critical') ||
        issue.toLowerCase().includes('large file') ||
        issue.toLowerCase().includes('duplication')
      );

      if (criticalIssues.length > 0) return criticalIssues[0];
      return file.issues[0];
    };

    // Get file score history data
    const getFileScoreHistory = () => {
      const scoreHistory: number[] = [];
      healthHistory.forEach(entry => {
        const foundFile = entry.results.components
          .flatMap(comp => comp.files)
          .find(f => f.filepath === file.filepath);
          
        if (foundFile) {
          scoreHistory.push(calculateFileAvgScore(foundFile));
        }
      });
      return scoreHistory;
    };
    
    const fileScoreHistory = getFileScoreHistory();
    const criticalIssue = getMostCriticalIssue();

    return (
      <Card key={file.filepath} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileHealthIndicator score={file.score} issueCount={file.issues.length} />
              <CardTitle className="text-sm font-medium">{displayName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {fileScoreHistory.length > 1 && (
                <SparklineChart 
                  data={fileScoreHistory}
                  lineColor={file.score < 70 ? "hsl(var(--destructive))" : 
                           file.score < 85 ? "hsl(var(--warning))" : 
                           "hsl(var(--success))"}
                  dotColor={file.score < 70 ? "hsl(var(--destructive))" : 
                         file.score < 85 ? "hsl(var(--warning))" : 
                         "hsl(var(--success))"}
                  width={60}
                  height={30}
                />
              )}
              <Badge variant={getBadgeVariant(file.score)} className={`
                ${file.score < 70 ? 'bg-destructive/10 dark:bg-destructive/20 dark:border-destructive/30 dark:text-destructive-foreground' : ''}
                ${file.score >= 70 && file.score < 85 ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400' : ''}
                ${file.score >= 85 ? 'bg-success/20 text-success-700 dark:bg-success/20 dark:border-success/30 dark:text-green-400' : ''}
              `}>{file.score}/100</Badge>
              {healthHistory.length > 1 && (
                <ScoreTrend filepath={file.filepath} />
              )}
            </div>
          </div>
          <CardDescription className="text-xs truncate">{file.filepath}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.size)} cursor-help`}>
                    <div className="font-semibold">Size</div>
                    <div className="flex items-center gap-1">
                      {/* Mini trend for size score */}
                      {healthHistory.length > 1 && (
                        <SparklineChart 
                          data={healthHistory.map(entry => {
                            const foundFile = entry.results.components
                              .flatMap(comp => comp.files)
                              .find(f => f.filepath === file.filepath);
                            return foundFile ? foundFile.size_score : 0;
                          }).filter(score => score > 0)}
                          lineColor={file.details.size < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                   file.details.size < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                   "rgba(var(--success-rgb), 0.7)"}
                          dotColor={file.details.size < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                  file.details.size < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                  "rgba(var(--success-rgb), 0.7)"}
                          width={24}
                          height={14}
                        />
                      )}
                      {file.details.size}/100
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 max-w-xs">
                  <p className="text-sm font-medium mb-1">File Size</p>
                  <p className="text-xs text-muted-foreground">Measures the size of a file. Large files become hard to read, debug, and maintain.</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${file.details.size < 70 ? 'bg-destructive' : file.details.size < 85 ? 'bg-warning' : 'bg-success'}`}></span>
                      <span className="text-xs">
                        {file.details.size < 70 ? 'Critical: File is too large and needs refactoring' : 
                         file.details.size < 85 ? 'Warning: File could benefit from some size reduction' : 
                         'Good: File size is appropriate'}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.complexity)} cursor-help`}>
                    <div className="font-semibold">Complexity</div>
                    <div className="flex items-center gap-1">
                      {/* Mini trend for complexity score */}
                      {healthHistory.length > 1 && (
                        <SparklineChart 
                          data={healthHistory.map(entry => {
                            const foundFile = entry.results.components
                              .flatMap(comp => comp.files)
                              .find(f => f.filepath === file.filepath);
                            return foundFile ? foundFile.complexity_score : 0;
                          }).filter(score => score > 0)}
                          lineColor={file.details.complexity < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                   file.details.complexity < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                   "rgba(var(--success-rgb), 0.7)"}
                          dotColor={file.details.complexity < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                  file.details.complexity < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                  "rgba(var(--success-rgb), 0.7)"}
                          width={24}
                          height={14}
                        />
                      )}
                      {file.details.complexity}/100
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 max-w-xs">
                  <p className="text-sm font-medium mb-1">Complexity</p>
                  <p className="text-xs text-muted-foreground">Assesses how intricate the logic is. Complex code is harder to follow, modify and more likely to contain bugs.</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${file.details.complexity < 70 ? 'bg-destructive' : file.details.complexity < 85 ? 'bg-warning' : 'bg-success'}`}></span>
                      <span className="text-xs">
                        {file.details.complexity < 70 ? 'Critical: Code is overly complex and needs simplification' : 
                         file.details.complexity < 85 ? 'Warning: Some complex patterns could be simplified' : 
                         'Good: Code complexity is well managed'}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.duplication)} cursor-help`}>
                    <div className="font-semibold">Duplication</div>
                    <div className="flex items-center gap-1">
                      {/* Mini trend for duplication score */}
                      {healthHistory.length > 1 && (
                        <SparklineChart 
                          data={healthHistory.map(entry => {
                            const foundFile = entry.results.components
                              .flatMap(comp => comp.files)
                              .find(f => f.filepath === file.filepath);
                            return foundFile ? foundFile.duplication_score : 0;
                          }).filter(score => score > 0)}
                          lineColor={file.details.duplication < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                   file.details.duplication < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                   "rgba(var(--success-rgb), 0.7)"}
                          dotColor={file.details.duplication < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                  file.details.duplication < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                  "rgba(var(--success-rgb), 0.7)"}
                          width={24}
                          height={14}
                        />
                      )}
                      {file.details.duplication}/100
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 max-w-xs">
                  <p className="text-sm font-medium mb-1">Duplication</p>
                  <p className="text-xs text-muted-foreground">Identifies repeated code. Duplication creates maintenance challenges as changes need to be applied in multiple places.</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${file.details.duplication < 70 ? 'bg-destructive' : file.details.duplication < 85 ? 'bg-warning' : 'bg-success'}`}></span>
                      <span className="text-xs">
                        {file.details.duplication < 70 ? 'Critical: Significant code duplication detected' : 
                         file.details.duplication < 85 ? 'Warning: Some code patterns are repeated and could be refactored' : 
                         'Good: Little to no code duplication found'}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.function_length)} cursor-help`}>
                    <div className="font-semibold">Func Length</div>
                    <div className="flex items-center gap-1">
                      {/* Mini trend for function length score */}
                      {healthHistory.length > 1 && (
                        <SparklineChart 
                          data={healthHistory.map(entry => {
                            const foundFile = entry.results.components
                              .flatMap(comp => comp.files)
                              .find(f => f.filepath === file.filepath);
                            return foundFile ? foundFile.function_length_score : 0;
                          }).filter(score => score > 0)}
                          lineColor={file.details.function_length < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                   file.details.function_length < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                   "rgba(var(--success-rgb), 0.7)"}
                          dotColor={file.details.function_length < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                  file.details.function_length < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                  "rgba(var(--success-rgb), 0.7)"}
                          width={24}
                          height={14}
                        />
                      )}
                      {file.details.function_length}/100
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 max-w-xs">
                  <p className="text-sm font-medium mb-1">Function Length</p>
                  <p className="text-xs text-muted-foreground">Detects functions that are too long. Shorter functions are easier to understand, test, and maintain.</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${file.details.function_length < 70 ? 'bg-destructive' : file.details.function_length < 85 ? 'bg-warning' : 'bg-success'}`}></span>
                      <span className="text-xs">
                        {file.details.function_length < 70 ? 'Critical: Functions are too long and should be broken down' : 
                         file.details.function_length < 85 ? 'Warning: Some functions could be shortened' : 
                         'Good: Functions are appropriately sized'}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.comment_density)} cursor-help`}>
                    <div className="font-semibold">Comments</div>
                    <div className="flex items-center gap-1">
                      {/* Mini trend for comment density score */}
                      {healthHistory.length > 1 && (
                        <SparklineChart 
                          data={healthHistory.map(entry => {
                            const foundFile = entry.results.components
                              .flatMap(comp => comp.files)
                              .find(f => f.filepath === file.filepath);
                            return foundFile ? foundFile.comment_density_score : 0;
                          }).filter(score => score > 0)}
                          lineColor={file.details.comment_density < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                   file.details.comment_density < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                   "rgba(var(--success-rgb), 0.7)"}
                          dotColor={file.details.comment_density < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                  file.details.comment_density < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                  "rgba(var(--success-rgb), 0.7)"}
                          width={24}
                          height={14}
                        />
                      )}
                      {file.details.comment_density}/100
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 max-w-xs">
                  <p className="text-sm font-medium mb-1">Comment Density</p>
                  <p className="text-xs text-muted-foreground">Measures whether code has enough explanatory comments to help developers understand intent and context.</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${file.details.comment_density < 70 ? 'bg-destructive' : file.details.comment_density < 85 ? 'bg-warning' : 'bg-success'}`}></span>
                      <span className="text-xs">
                        {file.details.comment_density < 70 ? 'Critical: Code lacks necessary comments and documentation' : 
                         file.details.comment_density < 85 ? 'Warning: Some sections could benefit from better comments' : 
                         'Good: Code is well-documented with helpful comments'}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.naming_convention)} cursor-help`}>
                    <div className="font-semibold">Naming</div>
                    <div className="flex items-center gap-1">
                      {/* Mini trend for naming convention score */}
                      {healthHistory.length > 1 && (
                        <SparklineChart 
                          data={healthHistory.map(entry => {
                            const foundFile = entry.results.components
                              .flatMap(comp => comp.files)
                              .find(f => f.filepath === file.filepath);
                            return foundFile ? foundFile.naming_convention_score : 0;
                          }).filter(score => score > 0)}
                          lineColor={file.details.naming_convention < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                   file.details.naming_convention < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                   "rgba(var(--success-rgb), 0.7)"}
                          dotColor={file.details.naming_convention < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                  file.details.naming_convention < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                  "rgba(var(--success-rgb), 0.7)"}
                          width={24}
                          height={14}
                        />
                      )}
                      {file.details.naming_convention}/100
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 max-w-xs">
                  <p className="text-sm font-medium mb-1">Naming Conventions</p>
                  <p className="text-xs text-muted-foreground">Checks if variables, functions, and components follow consistent naming patterns for improved readability.</p>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${file.details.naming_convention < 70 ? 'bg-destructive' : file.details.naming_convention < 85 ? 'bg-warning' : 'bg-success'}`}></span>
                      <span className="text-xs">
                        {file.details.naming_convention < 70 ? 'Critical: Naming conventions are inconsistent or unclear' : 
                         file.details.naming_convention < 85 ? 'Warning: Some names could be more descriptive or consistent' : 
                         'Good: Naming follows best practices and is consistent'}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {file.issues.length > 0 && (
            <div className="mt-3 border-t pt-3">
              {criticalIssue && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2 mb-2">
                  <div className="flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold mb-0.5">Critical Issue:</div>
                      <p className="text-xs">{criticalIssue}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs font-semibold mb-1">All Issues ({file.issues.length}):</div>
              <ul className="text-xs space-y-1">
                {file.issues.map((issue: string, i: number) => (
                  <li key={i} className="flex gap-1">
                    <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 text-xs"
            onClick={() => createFixTask(file)}
            disabled={creatingTask || file.issues.length === 0}
          >
            {creatingTask ? (
              <>
                <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin mr-1" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Fix Prompt
              </>
            )}
          </Button>
          {taskCreationSuccess === file.filepath && (
            <div className="mt-2 text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Fix prompt copied to clipboard
            </div>
          )}
          {taskCreationError === file.filepath && (
            <div className="mt-2 text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Failed to copy fix prompt
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!healthHistory.length) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Code Health</h1>
        <Alert className="max-w-2xl">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            No code health analysis data is available. Run an analysis to get started.
          </AlertDescription>
        </Alert>
        <Button onClick={runNewAnalysis} className="mt-4" variant="default">
          <RefreshCw className="mr-2 h-4 w-4" /> Run Analysis
        </Button>
      </div>
    );
  }

  const latestEntry = healthHistory[healthHistory.length - 1];
  const groupedFiles = getFilesGroupedByType();
  const fileTrends = calculateFileTrends();

  // Component to display score trend
  const ScoreTrend = ({ filepath }: { filepath: string }) => {
    if (!fileTrends[filepath]) return null;

    const { trend, change } = fileTrends[filepath];

    if (trend === 'up') {
      return (
        <span className="text-success text-xs flex items-center" title={`Improved by ${change} points over time`}>
          <ArrowUp className="h-3 w-3 mr-0.5" /> {change}
        </span>
      );
    } else if (trend === 'down') {
      return (
        <span className="text-destructive text-xs flex items-center" title={`Decreased by ${Math.abs(change)} points over time`}>
          <ArrowDown className="h-3 w-3 mr-0.5" /> {change}
        </span>
      );
    }

    return (
      <span className="text-muted-foreground text-xs flex items-center" title="No change over time">
        <Minus className="h-3 w-3 mr-0.5" /> 0
      </span>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Code Health</h1>
        <div className="flex items-center gap-4">
          <Button onClick={runNewAnalysis} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Run New Analysis
          </Button>
        </div>
      </div>

      {latestEntry && healthHistory.length > 0 && (
        <Alert 
          className={`mb-6 ${latestEntry.results.overall_score < 70 ? 'bg-destructive/10 border-destructive/20' : 
            latestEntry.results.overall_score < 85 ? 'bg-warning/10 border-warning/20' : 
            'bg-success/10 border-success/20'}`}
        >
          {latestEntry.results.overall_score < 70 ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : latestEntry.results.overall_score < 85 ? (
            <AlertCircle className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
          <AlertTitle>
            {latestEntry.results.overall_score < 70 ? 'Critical Attention Needed' : 
             latestEntry.results.overall_score < 85 ? 'Improvements Recommended' : 
             'Excellent Code Health'}
          </AlertTitle>
          <AlertDescription>
            {latestEntry.results.overall_score < 70 ? (
              <span>
                Your code health score of <strong>{latestEntry.results.overall_score}</strong> indicates significant issues. 
                Focus on addressing critical issues in the components with lowest scores first.
              </span>
            ) : latestEntry.results.overall_score < 85 ? (
              <span>
                Your code health score of <strong>{latestEntry.results.overall_score}</strong> is good but has room for improvement. 
                Address the highlighted issues to enhance maintainability.
              </span>
            ) : (
              <span>
                Your code health score of <strong>{latestEntry.results.overall_score}</strong> indicates excellent code quality. 
                Continue following best practices to maintain this standard.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card border border-border overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Health Score</CardTitle>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex">
                      <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-2 text-xs">
                    <p>Overall code quality score based on size, complexity, duplication, function length, comment density, and naming convention metrics.</p>
                    <p className="mt-1 font-medium">Why it matters:</p>
                    <p>Higher scores indicate code that is easier to maintain, extend, and debug.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={`text-6xl font-bold ${getScoreColor(latestEntry.results.overall_score)}`}>
                    {latestEntry.results.overall_score}
                  </div>
                  {healthHistory.length > 1 && (
                    <SparklineChart 
                      data={healthHistory.map(entry => entry.results.overall_score)}
                      lineColor={latestEntry.results.overall_score < 70 ? "hsl(var(--destructive))" : 
                              latestEntry.results.overall_score < 85 ? "hsl(var(--warning))" : 
                              "hsl(var(--success))"}
                      dotColor={latestEntry.results.overall_score < 70 ? "hsl(var(--destructive))" : 
                            latestEntry.results.overall_score < 85 ? "hsl(var(--warning))" : 
                            "hsl(var(--success))"}
                      width={60}
                      height={30}
                    />
                  )}
                </div>
                {healthHistory.length > 1 && (
                  <div className="flex items-center mt-2">
                    {(() => {
                      const previousEntry = healthHistory[healthHistory.length - 2];
                      const currentScore = latestEntry.results.overall_score;
                      const previousScore = previousEntry.results.overall_score;
                      const scoreDiff = currentScore - previousScore;

                      return (
                        <div className="text-muted-foreground text-xs">
                          {scoreDiff === 0 ? (
                            <span className="inline-flex items-center">— 0</span>
                          ) : scoreDiff > 0 ? (
                            <span className="inline-flex items-center text-success">+{scoreDiff}</span>
                          ) : (
                            <span className="inline-flex items-center text-destructive">{scoreDiff}</span>
                          )}
                          <span className="ml-1">since last check</span>
                        </div>
                      );
                    })()} 
                  </div>
                )}
              </div>
              <Progress 
                value={latestEntry.results.overall_score} 
                className={`h-4 ${latestEntry.results.overall_score < 70 ? "[&>div]:bg-destructive" : 
                  latestEntry.results.overall_score < 85 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`} 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {new Date(latestEntry.date).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Components Analyzed</CardTitle>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex">
                      <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-2 text-xs">
                    <p>Scores for different parts of your codebase. Click on any component to filter files by that category.</p>
                    <p className="mt-1">Lower scores indicate areas that need improvement.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 py-4">
            {latestEntry.results.components.map(component => {
              // Calculate trend for this component if possible
              let trend = null;
              if (healthHistory.length > 1) {
                const previousEntry = healthHistory[healthHistory.length - 2];
                const prevComponent = previousEntry.results.components.find(c => c.name === component.name);
                if (prevComponent) {
                  const diff = component.score - prevComponent.score;
                  if (diff > 0) trend = { direction: "up", value: diff };
                  else if (diff < 0) trend = { direction: "down", value: diff };
                }
              }

              return (
                <div 
                  key={component.name}
                  className={`px-3 py-2 rounded border ${getBgClass(component.score)} cursor-pointer transition-all hover:opacity-90`}
                  onClick={() => setSelectedComponent(component.name === selectedComponent ? "" : component.name)}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{component.name}</div>
                    {trend && (
                      <div className={trend.direction === "up" ? "text-success text-xs" : "text-destructive text-xs"}>
                        {trend.direction === "up" ? (
                          <span className="flex items-center"><ArrowUp className="h-3 w-3 mr-0.5" />{trend.value}</span>
                        ) : (
                          <span className="flex items-center"><ArrowDown className="h-3 w-3 mr-0.5" />{trend.value}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-2xl font-semibold">{component.score}</div>
                    {healthHistory.length > 1 && (
                      <SparklineChart 
                        data={healthHistory
                          .map(entry => {
                            const comp = entry.results.components.find(c => c.name === component.name);
                            return comp ? comp.score : null;
                          })
                          .filter(score => score !== null) as number[]}
                        lineColor={component.score < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                 component.score < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                 "rgba(var(--success-rgb), 0.7)"}
                        dotColor={component.score < 70 ? "rgba(var(--destructive-rgb), 0.7)" : 
                                component.score < 85 ? "rgba(var(--warning-rgb), 0.7)" : 
                                "rgba(var(--success-rgb), 0.7)"}
                        width={60}
                        height={30}
                      />
                    )}
                    <Badge variant={getBadgeVariant(component.score)} className="text-xs">
                      {component.files.length} {component.files.length === 1 ? "file" : "files"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card border border-border overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Critical Issues</CardTitle>
              
              {/* Summary of critical issues */}
              {latestEntry.results.components.flatMap(comp => comp.files).some(file => 
                calculateFileAvgScore(file) < 70
              ) && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex gap-2 items-center">
                    <AlertOctagon className="h-5 w-5 text-destructive" />
                    <h3 className="font-semibold text-sm">Critical Issues Detected</h3>
                  </div>
                  <p className="text-xs mt-1 mb-2">
                    The following files need immediate attention due to low health scores:
                  </p>
                  <div className="space-y-2">
                    {latestEntry.results.components.flatMap(comp => comp.files)
                      .filter(file => calculateFileAvgScore(file) < 70)
                      .slice(0, 3)
                      .map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          <span className="flex-1 truncate">{file.filepath}</span>
                          <div className="flex items-center gap-1">
                            {healthHistory.length > 1 && (
                              <SparklineChart 
                                data={healthHistory.map(entry => {
                                  const foundFile = entry.results.components
                                    .flatMap(comp => comp.files)
                                    .find(f => f.filepath === file.filepath);
                                  return foundFile ? calculateFileAvgScore(foundFile) : 0;
                                }).filter(score => score > 0)}
                                lineColor="rgba(var(--destructive-rgb), 0.7)"
                                dotColor="rgba(var(--destructive-rgb), 0.7)"
                                width={30}
                                height={14}
                              />
                            )}
                            <Badge variant="destructive">{calculateFileAvgScore(file)}/100</Badge>
                          </div>
                        </div>
                      ))
                    }
                    {latestEntry.results.components.flatMap(comp => comp.files).filter(file => calculateFileAvgScore(file) < 70).length > 3 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        And {latestEntry.results.components.flatMap(comp => comp.files).filter(file => calculateFileAvgScore(file) < 70).length - 3} more files with critical issues
                      </p>
                    )}
                  </div>
                </div>
              )}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex">
                      <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-2 text-xs">
                    <p>These issues have the highest impact on your code quality and should be addressed first.</p>
                    <p className="mt-1">Resolving these will significantly improve your overall health score.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="py-4">
            {getRecommendations().length > 0 ? (
              <ul className="space-y-3">
                {getRecommendations()
                  .filter(rec => {
                    // Filter for critical issues (containing words like 'severe', 'critical', etc.)
                    return rec.toLowerCase().includes('severe') || 
                           rec.toLowerCase().includes('critical') ||
                           rec.toLowerCase().includes('large file') ||
                           rec.toLowerCase().includes('duplication');
                  })
                  .slice(0, 3)
                  .map((rec, i) => (
                    <li key={i} className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm">{rec}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rec.toLowerCase().includes('size') ? 
                            "Split into smaller files with focused responsibilities" :
                          rec.toLowerCase().includes('complexity') ?
                            "Simplify logic by breaking into smaller functions" :
                          rec.toLowerCase().includes('duplication') ?
                            "Extract duplicated code into shared utility functions" :
                          rec.toLowerCase().includes('function') ?
                            "Break large functions into smaller focused ones" :
                          rec.toLowerCase().includes('comment') ?
                            "Add explanatory comments for complex logic" :
                            "Improve with better organization and naming"}
                        </p>
                      </div>
                    </li>
                  ))
                }
                {getRecommendations().filter(rec => 
                  rec.toLowerCase().includes('severe') || 
                  rec.toLowerCase().includes('critical') ||
                  rec.toLowerCase().includes('large file') ||
                  rec.toLowerCase().includes('duplication')
                ).length === 0 && latestEntry.results.components.flatMap(comp => comp.files).every(file => 
                  calculateFileAvgScore(file) >= 70
                ) && (
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">No critical issues detected</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Continue monitoring code quality as your app grows
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            ) : (
              <div className="flex justify-center items-center h-[120px] text-muted-foreground">
                <span>No recommendations available</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Banner removed - now available in Learn tab */}

      {/* Understanding Code Health Metrics section moved to Learn tab */}

      {/* Code Health Overview Tabs */}

      {/* Main content tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">
            <Gauge className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="files">
            <File className="mr-2 h-4 w-4" /> Files
          </TabsTrigger>

          <TabsTrigger value="learn">
            <HelpCircle className="mr-2 h-4 w-4" /> Learn
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Severity Legend */}
          <div className="flex items-center gap-6 p-4 bg-muted rounded-lg mb-4">
            <h3 className="font-medium text-sm">Severity Guide:</h3>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Critical</Badge>
              <span className="text-xs">Immediate attention needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30 dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-400/30">Warning</Badge>
              <span className="text-xs">Should be addressed soon</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/20 text-success-700 border-success/30 dark:bg-success/20 dark:text-green-400 dark:border-green-400/30">Low</Badge>
              <span className="text-xs">Minor optimizations</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">File Health by Category</h2>
          <Accordion type="single" collapsible className="space-y-4">
            {Object.entries(groupedFiles).map(([section, files]) => {
              if (files.length === 0) return null;

              // Calculate section averages
              const sectionAvgScore = Math.round(
                files.reduce((sum, file) => sum + file.score, 0) / files.length
              );

              return (
                <AccordionItem key={section} value={section}>
                  <AccordionTrigger className="px-4 py-2 rounded-lg hover:bg-muted group">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBadgeVariant(sectionAvgScore)}>{sectionAvgScore}</Badge>
                        <span className="font-medium">{section}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{files.length} files</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[400px]">File</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Issues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((file) => {
                          // Extract filename from path
                          const filename = file.filepath.split('/').pop();

                          return (
                            <TableRow key={file.filepath}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <FileHealthIndicator 
                                    score={file.score} 
                                    issueCount={file.issues.length} 
                                    size="sm" 
                                  />
                                  <div className="truncate max-w-[350px]">
                                    {/* For API __init__.py files, use the module name instead */}
                                    {file.filepath.includes('apis/') && filename === '__init__.py'
                                      ? file.filepath.split('/').slice(-2, -1)[0] // Get API module name
                                      : filename}
                                  </div>
                                  {healthHistory.length > 1 && (
                                    <ScoreTrend filepath={file.filepath} />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{file.filepath}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={getBadgeVariant(file.score)} className={`
                                ${file.score < 70 ? 'bg-destructive/10 dark:bg-destructive/20 dark:border-destructive/30 dark:text-destructive-foreground' : ''}
                                ${file.score >= 70 && file.score < 85 ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400' : ''}
                                ${file.score >= 85 ? 'bg-success/20 text-success-700 dark:bg-success/20 dark:border-success/30 dark:text-green-400' : ''}
                              `}>{file.score}/100</Badge>
                                  {file.scoreChange !== 0 && (
                                    <span className={file.scoreChange > 0 ? "text-success text-xs" : "text-destructive text-xs"}>
                                      {file.scoreChange > 0 ? "+" : ""}{file.scoreChange}
                                    </span>
                                  )}
                                  {showTrends && healthHistory.length > 1 && (
                                    <ScoreTrend filepath={file.filepath} />
                                  )}
                                </div>
                                <div className="grid grid-cols-6 gap-1 mt-1">
                                  <TooltipProvider delayDuration={300}>
                                    <div className="flex gap-1 w-full">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`h-1 rounded-full ${getBgClass(file.details.size)} cursor-help flex-1`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getBadgeVariant(file.details.size)}>{file.details.size}</Badge>
                                            <span className="font-medium">Size Score</span>
                                          </div>
                                          <p className="text-xs mb-1">Large files increase complexity and reduce maintainability.</p>
                                          {file.details.size < 70 && (
                                            <div className="text-xs text-destructive">
                                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                                              Critical: This file is too large and should be broken into smaller modules.
                                            </div>
                                          )}
                                          {file.details.size >= 70 && file.details.size < 85 && (
                                            <div className="text-xs text-warning">
                                              <AlertCircle className="h-3 w-3 inline mr-1" />
                                              Warning: This file is approaching the size limit and may need refactoring.
                                            </div>
                                          )}
                                          {file.details.size >= 85 && (
                                            <div className="text-xs text-success">
                                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                              Good: File size is within recommended limits.
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`h-1 rounded-full ${getBgClass(file.details.complexity)} cursor-help flex-1`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getBadgeVariant(file.details.complexity)}>{file.details.complexity}</Badge>
                                            <span className="font-medium">Complexity Score</span>
                                          </div>
                                          <p className="text-xs mb-1">High complexity makes code harder to understand, test, and maintain.</p>
                                          {file.details.complexity < 70 && (
                                            <div className="text-xs text-destructive">
                                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                                              Critical: This file contains highly complex code that should be simplified.
                                            </div>
                                          )}
                                          {file.details.complexity >= 70 && file.details.complexity < 85 && (
                                            <div className="text-xs text-warning">
                                              <AlertCircle className="h-3 w-3 inline mr-1" />
                                              Warning: Some complex logic should be refactored for better maintainability.
                                            </div>
                                          )}
                                          {file.details.complexity >= 85 && (
                                            <div className="text-xs text-success">
                                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                              Good: Code complexity is at a manageable level.
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`h-1 rounded-full ${getBgClass(file.details.duplication)} cursor-help flex-1`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getBadgeVariant(file.details.duplication)}>{file.details.duplication}</Badge>
                                            <span className="font-medium">Duplication Score</span>
                                          </div>
                                          <p className="text-xs mb-1">Duplicated code creates maintenance burdens and increases bug risk.</p>
                                          {file.details.duplication < 70 && (
                                            <div className="text-xs text-destructive">
                                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                                              Critical: Significant code duplication detected. Extract common functionality into reusable functions.
                                            </div>
                                          )}
                                          {file.details.duplication >= 70 && file.details.duplication < 85 && (
                                            <div className="text-xs text-warning">
                                              <AlertCircle className="h-3 w-3 inline mr-1" />
                                              Warning: Some duplication exists that could be abstracted into shared functions.
                                            </div>
                                          )}
                                          {file.details.duplication >= 85 && (
                                            <div className="text-xs text-success">
                                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                              Good: Code follows the DRY (Don't Repeat Yourself) principle.
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`h-1 rounded-full ${getBgClass(file.details.function_length)} cursor-help flex-1`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getBadgeVariant(file.details.function_length)}>{file.details.function_length}</Badge>
                                            <span className="font-medium">Function Length Score</span>
                                          </div>
                                          <p className="text-xs mb-1">Long functions are harder to understand, test, and maintain.</p>
                                          {file.details.function_length < 70 && (
                                            <div className="text-xs text-destructive">
                                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                                              Critical: Functions are too long. Break them into smaller, focused functions that do one thing well.
                                            </div>
                                          )}
                                          {file.details.function_length >= 70 && file.details.function_length < 85 && (
                                            <div className="text-xs text-warning">
                                              <AlertCircle className="h-3 w-3 inline mr-1" />
                                              Warning: Some functions could be shortened to improve readability and testability.
                                            </div>
                                          )}
                                          {file.details.function_length >= 85 && (
                                            <div className="text-xs text-success">
                                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                              Good: Functions follow the Single Responsibility Principle and are appropriately sized.
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`h-1 rounded-full ${getBgClass(file.details.comment_density)} cursor-help flex-1`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getBadgeVariant(file.details.comment_density)}>{file.details.comment_density}</Badge>
                                            <span className="font-medium">Comment Density Score</span>
                                          </div>
                                          <p className="text-xs mb-1">Comments explain why code exists and how it works, especially for complex logic.</p>
                                          {file.details.comment_density < 70 && (
                                            <div className="text-xs text-destructive">
                                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                                              Critical: Insufficient comments. Add explanations for complex logic and business rules.
                                            </div>
                                          )}
                                          {file.details.comment_density >= 70 && file.details.comment_density < 85 && (
                                            <div className="text-xs text-warning">
                                              <AlertCircle className="h-3 w-3 inline mr-1" />
                                              Warning: Some sections could benefit from additional comments to explain intent.
                                            </div>
                                          )}
                                          {file.details.comment_density >= 85 && (
                                            <div className="text-xs text-success">
                                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                              Good: Code is well-documented with helpful comments explaining the 'why' not just the 'what'.
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`h-1 rounded-full ${getBgClass(file.details.naming_convention)} cursor-help flex-1`}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={getBadgeVariant(file.details.naming_convention)}>{file.details.naming_convention}</Badge>
                                            <span className="font-medium">Naming Convention Score</span>
                                          </div>
                                          <p className="text-xs mb-1">Consistent, clear naming makes code more readable and self-documenting.</p>
                                          {file.details.naming_convention < 70 && (
                                            <div className="text-xs text-destructive">
                                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                                              Critical: Naming issues detected. Use descriptive names that reflect purpose and follow project conventions.
                                            </div>
                                          )}
                                          {file.details.naming_convention >= 70 && file.details.naming_convention < 85 && (
                                            <div className="text-xs text-warning">
                                              <AlertCircle className="h-3 w-3 inline mr-1" />
                                              Warning: Some names could be improved for clarity or consistency.
                                            </div>
                                          )}
                                          {file.details.naming_convention >= 85 && (
                                            <div className="text-xs text-success">
                                              <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                              Good: Names are descriptive, consistent, and follow project conventions.
                                            </div>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  {file.issues.length > 0 ? (
                                    <>
                                      <Badge variant="outline" className="text-muted-foreground mb-1 w-fit">
                                        {file.issues.length} {file.issues.length === 1 ? "issue" : "issues"}
                                      </Badge>
                                      {/* Show first issue as preview */}
                                      {file.issues.length > 0 && (
                                        <TooltipProvider delayDuration={300}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <p className="text-xs text-muted-foreground truncate cursor-help">
                                                {file.issues[0].substring(0, 40)}{file.issues[0].length > 40 ? '...' : ''}
                                              </p>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="max-w-md p-3">
                                              <h4 className="font-medium mb-1">Issues:</h4>
                                              <ul className="text-xs space-y-1 list-disc pl-3">
                                                {file.issues.map((issue, idx) => {
                                                  // Determine severity based on keywords
                                                  const isCritical = issue.toLowerCase().includes('severe') || 
                                                                  issue.toLowerCase().includes('critical') ||
                                                                  issue.toLowerCase().includes('large file') ||
                                                                  issue.toLowerCase().includes('duplication');
                                                  const isWarning = issue.toLowerCase().includes('moderate') || 
                                                                  issue.toLowerCase().includes('improve') ||
                                                                  issue.toLowerCase().includes('consider');

                                                  // Get suggestion based on issue type
                                                  const getSuggestion = () => {
                                                    if (issue.toLowerCase().includes('size')) {
                                                      return "Consider breaking this file into smaller modules with focused responsibilities.";
                                                    } else if (issue.toLowerCase().includes('complexity')) {
                                                      return "Simplify logic by breaking it into smaller functions with clear purposes.";
                                                    } else if (issue.toLowerCase().includes('duplication')) {
                                                      return "Extract duplicated code into shared utility functions.";
                                                    } else if (issue.toLowerCase().includes('function length')) {
                                                      return "Break large functions into smaller ones that each do one thing well.";
                                                    } else if (issue.toLowerCase().includes('comment')) {
                                                      return "Add comments to explain complex logic and business rules.";
                                                    } else if (issue.toLowerCase().includes('naming')) {
                                                      return "Use descriptive names that clearly indicate what each variable/function does.";
                                                    }
                                                    return "";
                                                  };

                                                  const suggestion = getSuggestion();

                                                  return (
                                                    <li key={idx} className="pb-2 last:pb-0">
                                                      <div className="flex items-start gap-1">
                                                        {isCritical ? (
                                                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                                                        ) : isWarning ? (
                                                          <AlertCircle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                                                        ) : (
                                                          <InfoIcon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                                        )}
                                                        <div>
                                                          <span className={`${isCritical ? 'text-destructive font-medium' : isWarning ? 'text-warning font-medium' : ''}`}>
                                                            {issue}
                                                          </span>
                                                          {suggestion && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                              <span className="font-medium">Suggestion:</span> {suggestion}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </li>
                                                  );
                                                })}
                                              </ul>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 w-fit">
                                      No issues
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-8">
          {/* Severity Legend */}
          <div className="flex items-center gap-6 p-4 bg-muted rounded-lg mb-4">
            <h3 className="font-medium text-sm">Severity Guide:</h3>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Critical</Badge>
              <span className="text-xs">Immediate attention needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30 dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-400/30">Warning</Badge>
              <span className="text-xs">Should be addressed soon</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/20 text-success-700 border-success/30 dark:bg-success/20 dark:text-green-400 dark:border-green-400/30">Low</Badge>
              <span className="text-xs">Minor optimizations</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-4">File Details</h2>

          {/* Show files by category */}
          {Object.entries(groupedFiles).map(([category, files]) => {
            // Filter files if a component is selected
            const filesToShow = selectedComponent
              ? files.filter(f => f.component === selectedComponent)
              : files;

            if (filesToShow.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">{category}</h3>
                  <Badge variant="outline">{filesToShow.length} files</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filesToShow.map(file => renderFileMetricsCard(file))}
                </div>
                {category !== Object.keys(groupedFiles).pop() && <Separator className="my-4" />}
              </div>
            );
          })}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {/* Severity Legend */}
          <div className="flex items-center gap-6 p-4 bg-muted rounded-lg mb-2">
            <h3 className="font-medium text-sm">Severity Guide:</h3>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Critical</Badge>
              <span className="text-xs">Immediate attention needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30 dark:bg-amber-500/30 dark:text-amber-400 dark:border-amber-400/30">Warning</Badge>
              <span className="text-xs">Should be addressed soon</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 dark:bg-success/20 dark:text-green-400 dark:border-green-400/30">Low</Badge>
              <span className="text-xs">Minor optimizations</span>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Top Issues By File</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Get top 5 files with most issues */}
                  {Object.values(groupedFiles)
                    .flat()
                    .sort((a, b) => b.issues.length - a.issues.length)
                    .slice(0, 5)
                    .map(file => {
                      const filename = file.filepath.split('/').pop();

                      return (
                        <TableRow key={file.filepath}>
                          <TableCell>
                            <div className="font-medium">{filename}</div>
                            <div className="text-xs text-muted-foreground">{file.filepath}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getBadgeVariant(file.score)}>{file.score}/100</Badge>
                              {showTrends && healthHistory.length > 1 && (
                                <ScoreTrend filepath={file.filepath} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{file.issues.length} issues</div>
                            {file.issues.length > 0 && (
                              <div className="text-xs text-muted-foreground truncate">
                                {file.issues[0]}
                                {file.issues.length > 1 && " ..."}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>API Detection Debug</CardTitle>
              <CardDescription>
                Information about API file detection for troubleshooting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {latestEntry.results.components
                  .filter(c => c.name === "APIs")
                  .map((apiComponent, i) => (
                    <div key={i} className="space-y-2">
                      <p>API Component found with {apiComponent.files.length} files</p>
                      <div className="bg-muted p-3 rounded overflow-auto max-h-[200px]">
                        <pre className="whitespace-pre-wrap text-xs">
                          {apiComponent.files.map(file => (
                            `${file.filepath} (Score: ${calculateFileAvgScore(file)})\n`
                          )).join('')}
                        </pre>
                      </div>
                    </div>
                  ))
                }
                {latestEntry.results.components.filter(c => c.name === "APIs").length === 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No API Component Found</AlertTitle>
                    <AlertDescription>
                      The analyzer did not detect an API component in your codebase.
                      This might be due to the file detection logic not matching your API structure.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="mt-4">
                  <h4 className="font-medium mb-2">API Path Detection Patterns:</h4>
                  <div className="bg-muted p-3 rounded">
                    <pre className="whitespace-pre-wrap text-xs">
                      - app/apis/
                      - src/app/apis/
                      - apis/
                      - apis/[folder]/__init__.py
                      - apis/[folder]/*.py
                      - api/[folder]
                      - /api/
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Learn Tab */}
        <TabsContent value="learn" className="space-y-6">
          <div className="mb-8 space-y-6">
            <h2 className="text-xl font-semibold">Understanding Code Health Metrics</h2>
            <p className="text-muted-foreground">
              Code health metrics help identify potential issues that could affect your application's performance, maintainability, 
              and future development. Addressing these issues early prevents technical debt and makes it easier to add new features later.
            </p>

            {/* Severity Indicator Guide */}
            <div className="bg-muted p-4 rounded-lg mb-4">
              <h3 className="text-base font-medium mb-2">Understanding Severity Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-destructive"></div>
                    <span className="font-medium">Critical (Below 70)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">These issues require immediate attention as they significantly impact code quality and maintainability. Fixing these should be top priority.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-warning"></div>
                    <span className="font-medium">Warning (70-85)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">These issues should be addressed soon as they may cause problems as your application grows. Addressing them prevents future technical debt.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-success"></div>
                    <span className="font-medium">Good (Above 85)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">These areas are following best practices. Continue maintaining this level of quality as your application evolves.</p>
                </div>
              </div>
            </div>

            {/* Code Quality Impact Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">How Code Quality Impacts Your App</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Development Speed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">High-quality code enables faster development of new features. When code is clean and well-structured, adding new functionality requires less time to understand existing code and reduces the risk of introducing bugs.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bug Introduction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Poor code quality significantly increases the risk of bugs. Complex, duplicated, or poorly structured code makes it difficult to predict how changes might affect the entire application.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Knowledge Transfer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Well-structured code with appropriate comments makes it easier for new team members to understand how the application works. This reduces onboarding time and prevents knowledge silos.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Technical Debt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Ignoring code quality issues leads to accumulated technical debt. Over time, this debt makes changes increasingly expensive and risky, potentially requiring complete rewrites of components.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Best Practices Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Best Practices for Improving Code Quality</h3>
              <CodeHealthBestPractices />
            </div>

            {/* Code Size Section */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">Detailed Metric Explanations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricInfoCard
                  title="File Size"
                  description="Measures the overall size of a file"
                  whatItMeans="Large files often try to do too many things at once, violating the Single Responsibility Principle."
                  whyItMatters="Smaller, focused files are easier to understand, debug, and maintain. They also promote code reuse."
                  consequences="Large files become increasingly difficult to navigate, understand, and modify. They often become hotspots for bugs and technical debt."
                />
                <MetricInfoCard
                  title="Code Complexity"
                  description="Measures the logical complexity of the code"
                  whatItMeans="Complex code has many branches, loops, and nested logic that make it harder to follow and reason about."
                  whyItMatters="Simpler code is easier to understand, test, and modify. It's also less likely to contain subtle bugs."
                  consequences="As complexity increases, understanding how code behaves in different scenarios becomes exponentially harder, leading to unexpected side effects when making changes."
                />
                <MetricInfoCard
                  title="Code Duplication"
                  description="Identifies repeated code patterns"
                  whatItMeans="Duplicated code requires the same changes to be made in multiple places, increasing the risk of inconsistencies."
                  whyItMatters="DRY (Don't Repeat Yourself) is a fundamental principle of good code. Reusable components and utilities improve maintainability."
                  consequences="When code is duplicated, fixes or improvements need to be made in multiple places. Missing one instance creates inconsistencies and bugs."
                />
                <MetricInfoCard
                  title="Function Length"
                  description="Measures the size of individual functions"
                  whatItMeans="Long functions often try to do too many things at once and become difficult to understand as a whole."
                  whyItMatters="Shorter functions with clear purposes are easier to understand, test, and reuse. They follow the Single Responsibility Principle."
                  consequences="Long functions become 'black boxes' that developers are afraid to modify. They're difficult to test and often contain unused or redundant code."
                />
                <MetricInfoCard
                  title="Comment Density"
                  description="Evaluates the presence and quality of code comments"
                  whatItMeans="Good comments explain why code works a certain way, not just what it does. They provide context for future developers."
                  whyItMatters="Well-commented code helps new team members understand the codebase faster and preserves historical context."
                  consequences="Poorly commented code often results in features that nobody wants to touch for fear of breaking something, slowing development."
                />
                <MetricInfoCard
                  title="Naming Conventions"
                  description="Assesses how well variable and function names convey their purpose"
                  whatItMeans="Good naming makes code self-documenting and reduces the cognitive load needed to understand it."
                  whyItMatters="Clear, consistent naming allows developers to understand what code does without having to trace through its implementation."
                  consequences="Poor naming requires developers to mentally translate variables and functions, increasing the likelihood of misunderstanding and bugs."
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CodeHealth;
