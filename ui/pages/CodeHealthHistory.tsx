import React, { useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import { AlertTriangleIcon, InfoIcon, BoxIcon, CodeIcon, CopyIcon, ServerIcon, MessageSquareIcon, TextIcon } from "lucide-react";
import brain from "brain";
import CodeHealthChart, { HealthHistoryEntry } from "components/CodeHealthChart";
import { 
  getScoreColorClass, 
  getScoreBgClass, 
  getChangeIndicator, 
  processFilesData,
  categorizeFileByPath
} from "utils/codeHealthUtils";
import FileScoreTable from "components/FileScoreTable";
import SectionAccordion from "components/SectionAccordion";

/**
 * Helper function to combine Tailwind CSS classes
 * @param classes - Array of class names to be combined
 * @returns Combined class string with no falsy values
 */

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const CodeHealthHistory: React.FC = () => {
  const [healthHistory, setHealthHistory] = useState<HealthHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<"overview" | "components" | "files">("overview");
  const [selectedComponent, setSelectedComponent] = useState<string>("");
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(false);

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

  // Get list of available components from the latest health check
  const getComponentsList = () => {
    if (!healthHistory.length) return [];
    const latestEntry = healthHistory[healthHistory.length - 1];
    return latestEntry.results.components.map((component) => component.name);
  };
  
  /**
   * Group files by their type (pages, components, UI files, API files)
   * @returns Object with files grouped by category
   */
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
    
    // Extract all files from previous entry for comparison (if available)
    const previousFiles = previousEntry ? 
      previousEntry.results.components.flatMap(component => component.files) : 
      [];
    
    // Process all files from all components
    const processedFiles = latestEntry.results.components.flatMap(component => {
      return processFilesData(component.files, previousFiles).map(fileInfo => ({
        ...fileInfo,
        component: component.name
      }));
    });
    
    // Group files by their category
    processedFiles.forEach(fileInfo => {
      const category = categorizeFileByPath(fileInfo.filepath);
      allFiles[category].push(fileInfo);
    });
    
    // Sort each category by score (lowest to highest)
    Object.keys(allFiles).forEach(key => {
      allFiles[key].sort((a, b) => a.score - b.score);
    });
    
    return allFiles;
  };
  
  /**
   * Render metric badges for file details
   * @param file - File object with metric details
   * @returns JSX for metric badges
   */
  const renderMetricBadges = (file: any) => (
    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1.5">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getScoreBgClass(file.details.size)}`}>
        <BoxIcon className="h-3 w-3 mr-1" /> Size: {file.details.size}
      </span>
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getScoreBgClass(file.details.complexity)}`}>
        <CodeIcon className="h-3 w-3 mr-1" /> Complexity: {file.details.complexity}
      </span>
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getScoreBgClass(file.details.duplication)}`}>
        <CopyIcon className="h-3 w-3 mr-1" /> Dup: {file.details.duplication}
      </span>
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getScoreBgClass(file.details.function_length)}`}>
        <ServerIcon className="h-3 w-3 mr-1" /> Func: {file.details.function_length}
      </span>
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getScoreBgClass(file.details.comment_density)}`}>
        <MessageSquareIcon className="h-3 w-3 mr-1" /> Com: {file.details.comment_density}
      </span>
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getScoreBgClass(file.details.naming_convention)}`}>
        <TextIcon className="h-3 w-3 mr-1" /> Name: {file.details.naming_convention}
      </span>
    </div>
  );

  /**
   * Get recommendations from latest health check
   * @returns Array of recommendation strings
   */
  const getRecommendations = () => {
    if (!healthHistory.length) return [];
    const latestEntry = healthHistory[healthHistory.length - 1];
    return latestEntry.results.recommendations;
  };

  /**
   * Get issues for a specific component
   * @param componentName - Name of the component to get issues for
   * @returns Array of issue strings
   */
  const getComponentIssues = (componentName: string) => {
    if (!healthHistory.length) return [];
    const latestEntry = healthHistory[healthHistory.length - 1];
    const component = latestEntry.results.components.find(
      (c) => c.name === componentName
    );
    return component?.issues || [];
  };
  
  /**
   * Run a new code health analysis
   */
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Code Health History</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      ) : (
        <div>
          {/* Summary statistics */}
          {healthHistory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Current Health Score</h3>
                <div className="text-4xl font-bold text-blue-600">
                  {healthHistory[healthHistory.length - 1].results.overall_score}/100
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Last updated: {new Date(healthHistory[healthHistory.length - 1].date).toLocaleDateString()}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Highest Score</h3>
                <div className="text-4xl font-bold text-green-600">
                  {Math.max(...healthHistory.map(entry => entry.results.overall_score))}/100
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Health score trend over {healthHistory.length} checks
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Components</h3>
                <div className="text-4xl font-bold text-purple-600">
                  {healthHistory[healthHistory.length - 1].results.components.length}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Total code components analyzed
                </div>
              </div>
            </div>
          )}

          {/* Tab navigation */}
          <div className="mb-6">
            <Tabs.Root 
              defaultValue="overview" 
              onValueChange={(value) => setSelectedTab(value as "overview" | "components" | "files")}>
              <Tabs.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                <Tabs.Trigger
                  value="overview"
                  className={classNames(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "data-[state=active]:bg-white data-[state=active]:shadow",
                    "data-[state=inactive]:text-blue-100 data-[state=inactive]:hover:bg-white/[0.12] data-[state=inactive]:hover:text-white",
                    "focus:outline-none focus:ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400"
                  )}
                >
                  Overall Trend
                </Tabs.Trigger>
                
                <Tabs.Trigger
                  value="components"
                  className={classNames(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "data-[state=active]:bg-white data-[state=active]:shadow",
                    "data-[state=inactive]:text-blue-100 data-[state=inactive]:hover:bg-white/[0.12] data-[state=inactive]:hover:text-white",
                    "focus:outline-none focus:ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400"
                  )}
                >
                  Components
                </Tabs.Trigger>
                
                <Tabs.Trigger
                  value="files"
                  className={classNames(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "data-[state=active]:bg-white data-[state=active]:shadow",
                    "data-[state=inactive]:text-blue-100 data-[state=inactive]:hover:bg-white/[0.12] data-[state=inactive]:hover:text-white",
                    "focus:outline-none focus:ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400"
                  )}
                >
                  File Details
                </Tabs.Trigger>
              </Tabs.List>
              
              <div className="mt-2">
                <Tabs.Content value="overview" className="rounded-xl bg-white p-3">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Code Health Overview</h2>
                    
                    {/* Section overview */}
                    {healthHistory.length > 0 && (
                      <div className="mb-8">
                        <SectionAccordion 
                          sections={getFilesGroupedByType()} 
                          renderMetricBadges={renderMetricBadges} 
                        />
                      </div>
                    )}
                    
                    <Separator.Root className="my-6 h-[1px] bg-gray-200" />
                    
                    <h3 className="text-lg font-semibold mb-2">Health Score Trend</h3>
                    <CodeHealthChart 
                      healthHistory={healthHistory}
                      selectedTab="overview" 
                    />
                    
                    {/* Recommendations */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {getRecommendations().map((recommendation, index) => (
                          <li key={index} className="text-gray-700">{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Tabs.Content>
                
                <Tabs.Content value="components" className="rounded-xl bg-white p-3">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Component Health Score Trend</h2>
                    <CodeHealthChart 
                      healthHistory={healthHistory}
                      selectedTab="components" 
                    />
                    
                    {/* Component selection */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {getComponentsList().map((componentName) => {
                        const latestEntry = healthHistory[healthHistory.length - 1];
                        const component = latestEntry.results.components.find(c => c.name === componentName);
                        const score = component?.score || 0;
                        let colorClass = "bg-green-100 border-green-500 text-green-800";
                        
                        if (score < 70) {
                          colorClass = "bg-red-100 border-red-500 text-red-800";
                        } else if (score < 85) {
                          colorClass = "bg-yellow-100 border-yellow-500 text-yellow-800";
                        }
                        
                        return (
                          <div 
                            key={componentName}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${colorClass} ${selectedComponent === componentName ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => {
                              setSelectedComponent(componentName);
                              setSelectedTab("files");
                            }}
                          >
                            <div className="font-medium">{componentName}</div>
                            <div className="text-2xl font-bold">{score}/100</div>
                            <div className="text-sm mt-1">{component?.files.length || 0} files</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Tabs.Content>
                
                <Tabs.Content value="files" className="rounded-xl bg-white p-3">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">File Health Scores</h2>
                      
                      <div className="flex items-center space-x-2">
                        <select 
                          className="border rounded-md px-3 py-1"
                          value={selectedComponent}
                          onChange={(e) => setSelectedComponent(e.target.value)}
                        >
                          <option value="">Select a component</option>
                          {getComponentsList().map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        
                        <label className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            checked={showScoreBreakdown}
                            onChange={(e) => setShowScoreBreakdown(e.target.checked)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <span className="text-sm">Show score breakdown</span>
                        </label>
                      </div>
                    </div>
                    
                    <CodeHealthChart 
                      healthHistory={healthHistory}
                      selectedTab="files"
                      selectedComponent={selectedComponent}
                      showScoreBreakdown={showScoreBreakdown}
                    />
                    
                    {/* Component issues */}
                    {selectedComponent && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-2">Issues in {selectedComponent}</h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          {getComponentIssues(selectedComponent).length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {getComponentIssues(selectedComponent).map((issue, index) => (
                                <li key={index} className="text-gray-700">{issue}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500">No issues found for this component.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end mt-8 space-x-4">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              onClick={runNewAnalysis}
            >
              Run New Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeHealthHistory;
