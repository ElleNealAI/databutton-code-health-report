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
import { AlertTriangle, ArrowDown, ArrowUp, Code, Copy, File, FileText, Gauge, Info, Minus, MessageSquare, RefreshCw } from "lucide-react";
import brain from "brain";

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
  return Math.round(
    (file.size_score +
      file.complexity_score +
      file.duplication_score +
      file.function_length_score +
      file.comment_density_score +
      file.naming_convention_score) / 6
  );
};

// Helper function to categorize files by path
const categorizeFileByPath = (filepath: string): string => {
  if (filepath.includes('/pages/')) {
    return "Pages";
  } else if (filepath.includes('/components/')) {
    return "Components";
  } else if (filepath.includes('/utils/') || filepath.includes('/src/utils/')) {
    return "UI Files";
  } else if (filepath.includes('/apis/') || filepath.includes('/api/') || filepath.includes('src/app/apis/')) {
    return "API Files";
  } else {
    return "Other";
  }
};

const CodeHealth: React.FC = () => {
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  const [selectedComponent, setSelectedComponent] = useState<string>("");
  const [showTrends, setShowTrends] = useState<boolean>(true);

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

  // Run a new analysis
  const runNewAnalysis = async () => {
    try {
      setLoading(true);
      await brain.analyze_code_health();
      const response = await brain.get_health_check_history();
      const data = await response.json();
      setHealthHistory(data);
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

  // Render File Metrics Card
  const renderFileMetricsCard = (file: any) => {
    // Extract filename from path
    const filename = file.filepath.split('/').pop();
    
    return (
      <Card key={file.filepath} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">{filename}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getBadgeVariant(file.score)}>{file.score}/100</Badge>
              {showTrends && healthHistory.length > 1 && (
                <ScoreTrend filepath={file.filepath} />
              )}
            </div>
          </div>
          <CardDescription className="text-xs truncate">{file.filepath}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.size)}`}>
              <div className="font-semibold">Size</div>
              <div>{file.details.size}/100</div>
            </div>
            <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.complexity)}`}>
              <div className="font-semibold">Complexity</div>
              <div>{file.details.complexity}/100</div>
            </div>
            <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.duplication)}`}>
              <div className="font-semibold">Duplication</div>
              <div>{file.details.duplication}/100</div>
            </div>
            <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.function_length)}`}>
              <div className="font-semibold">Func Length</div>
              <div>{file.details.function_length}/100</div>
            </div>
            <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.comment_density)}`}>
              <div className="font-semibold">Comments</div>
              <div>{file.details.comment_density}/100</div>
            </div>
            <div className={`rounded p-1.5 text-xs ${getBgClass(file.details.naming_convention)}`}>
              <div className="font-semibold">Naming</div>
              <div>{file.details.naming_convention}/100</div>
            </div>
          </div>
          
          {file.issues.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold mb-1">Issues:</div>
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
          <Info className="h-4 w-4" />
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
          <div className="flex items-center gap-2">
            <label htmlFor="show-trends" className="text-sm cursor-pointer">
              Show progress trends
            </label>
            <input
              id="show-trends"
              type="checkbox"
              checked={showTrends}
              onChange={(e) => setShowTrends(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          <Button onClick={runNewAnalysis} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Run New Analysis
          </Button>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`text-4xl font-bold ${getScoreColor(latestEntry.results.overall_score)}`}>
                  {latestEntry.results.overall_score}
                </div>
                {healthHistory.length > 1 && (
                  <div className="mt-1">
                    {(() => {
                      const previousEntry = healthHistory[healthHistory.length - 2];
                      const currentScore = latestEntry.results.overall_score;
                      const previousScore = previousEntry.results.overall_score;
                      const scoreDiff = currentScore - previousScore;
                      
                      if (scoreDiff > 0) {
                        return (
                          <span className="text-success text-xs flex items-center" title={`Improved by ${scoreDiff} points`}>
                            <ArrowUp className="h-3 w-3 mr-0.5" /> {scoreDiff}
                          </span>
                        );
                      } else if (scoreDiff < 0) {
                        return (
                          <span className="text-destructive text-xs flex items-center" title={`Decreased by ${Math.abs(scoreDiff)} points`}>
                            <ArrowDown className="h-3 w-3 mr-0.5" /> {scoreDiff}
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-muted-foreground text-xs flex items-center" title="No change">
                            <Minus className="h-3 w-3 mr-0.5" /> 0
                          </span>
                        );
                      }
                    })()} 
                  </div>
                )}
              </div>
              <Progress 
                value={latestEntry.results.overall_score} 
                className="h-3 flex-1" 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date(latestEntry.date).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Components Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {latestEntry.results.components.map(component => (
                <div 
                  key={component.name}
                  className={`px-3 py-2 rounded ${getBgClass(component.score)} cursor-pointer transition-all hover:opacity-80`}
                  onClick={() => setSelectedComponent(component.name)}
                >
                  <div className="text-xs font-medium">{component.name}</div>
                  <div className="text-lg font-semibold">{component.score}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[120px] overflow-y-auto">
            <ul className="space-y-1 text-sm">
              {getRecommendations().slice(0, 3).map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Main content tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">
            <Gauge className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="files">
            <File className="mr-2 h-4 w-4" /> Files
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <FileText className="mr-2 h-4 w-4" /> Recommendations
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
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
                                  <div className="truncate max-w-[350px]">{filename}</div>
                                  {showTrends && healthHistory.length > 1 && (
                                    <ScoreTrend filepath={file.filepath} />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{file.filepath}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={getBadgeVariant(file.score)}>{file.score}/100</Badge>
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
                                  <div className={`h-1 rounded-full ${getBgClass(file.details.size)}`}></div>
                                  <div className={`h-1 rounded-full ${getBgClass(file.details.complexity)}`}></div>
                                  <div className={`h-1 rounded-full ${getBgClass(file.details.duplication)}`}></div>
                                  <div className={`h-1 rounded-full ${getBgClass(file.details.function_length)}`}></div>
                                  <div className={`h-1 rounded-full ${getBgClass(file.details.comment_density)}`}></div>
                                  <div className={`h-1 rounded-full ${getBgClass(file.details.naming_convention)}`}></div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {file.issues.length > 0 ? (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    {file.issues.length} {file.issues.length === 1 ? "issue" : "issues"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                    No issues
                                  </Badge>
                                )}
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
        <TabsContent value="recommendations" className="space-y-4">
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
              <CardTitle>Key Recommendations</CardTitle>
              <CardDescription>
                Based on code analysis completed on {new Date(latestEntry.date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getRecommendations().length > 0 ? (
                <ul className="space-y-2">
                  {getRecommendations().map((rec, i) => (
                    <li key={i} className="flex gap-2 pb-2 border-b last:border-0">
                      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p>{rec}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No recommendations available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CodeHealth;
