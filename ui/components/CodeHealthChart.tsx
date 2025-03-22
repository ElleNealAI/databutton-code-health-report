import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";

export interface HealthHistoryEntry {
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

interface Props {
  healthHistory: HealthHistoryEntry[];
  selectedTab: "overview" | "components" | "files";
  selectedComponent?: string;
  showScoreBreakdown?: boolean;
}

const CodeHealthChart: React.FC<Props> = ({
  healthHistory,
  selectedTab,
  selectedComponent,
  showScoreBreakdown = false,
}) => {
  // Format dates and prepare data for charts
  const formatHistoryData = (entries: HealthHistoryEntry[]) => {
    return entries.map((entry) => ({
      date: format(new Date(entry.date), "MMM d, yyyy"),
      score: entry.results.overall_score,
      ...entry.results.components.reduce(
        (acc, component) => {
          acc[component.name] = component.score;
          return acc;
        },
        {} as Record<string, number>
      ),
    }));
  };

  // Get the most recent component data for the selected component
  const getComponentData = () => {
    if (!healthHistory.length) return [];

    const latestEntry = healthHistory[healthHistory.length - 1];
    const selectedComponentData = latestEntry.results.components.find(
      (c) => c.name === selectedComponent
    );

    if (!selectedComponentData) return [];

    // Return the files with their scores
    return selectedComponentData.files.map((file) => ({
      name: file.filepath.split("/").pop() || file.filepath,
      filepath: file.filepath,
      score: (
        (file.size_score +
          file.complexity_score +
          file.duplication_score +
          file.function_length_score +
          file.comment_density_score +
          file.naming_convention_score) /
        6
      ).toFixed(0),
      ...(showScoreBreakdown
        ? {
            size: file.size_score,
            complexity: file.complexity_score,
            duplication: file.duplication_score,
            function_length: file.function_length_score,
            comment_density: file.comment_density_score,
            naming_convention: file.naming_convention_score,
          }
        : {}),
    }));
  };

  // Get all components scores over time
  const getComponentScoresOverTime = () => {
    return healthHistory.map((entry) => {
      const result = {
        date: format(new Date(entry.date), "MMM d, yyyy"),
      } as Record<string, any>;

      entry.results.components.forEach((component) => {
        result[component.name] = component.score;
      });

      return result;
    });
  };

  // Format file scores for the selected component's files
  const getFileScores = () => {
    if (!healthHistory.length || !selectedComponent) return [];

    const latestEntry = healthHistory[healthHistory.length - 1];
    const componentData = latestEntry.results.components.find(
      (c) => c.name === selectedComponent
    );

    if (!componentData || !componentData.files.length) return [];

    return componentData.files
      .map((file) => ({
        name: file.filepath.split("/").pop() || file.filepath,
        filepath: file.filepath,
        size: file.size_score,
        complexity: file.complexity_score,
        duplication: file.duplication_score,
        function_length: file.function_length_score,
        comment_density: file.comment_density_score,
        naming_convention: file.naming_convention_score,
        // Calculate average score
        score: Math.round(
          (file.size_score +
            file.complexity_score +
            file.duplication_score +
            file.function_length_score +
            file.comment_density_score +
            file.naming_convention_score) /
            6
        ),
      }))
      .sort((a, b) => a.score - b.score); // Sort by score ascending to highlight problematic files
  };

  // Determine which chart to render based on selected tab
  const renderChart = () => {
    if (selectedTab === "overview") {
      const data = formatHistoryData(healthHistory);
      // Overall score trend over time
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Overall Health Score"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (selectedTab === "components") {
      const data = getComponentScoresOverTime();
      // Component scores over time
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            {healthHistory.length > 0 &&
              healthHistory[0].results.components.map((component, index) => (
                <Line
                  key={component.name}
                  type="monotone"
                  dataKey={component.name}
                  stroke={`hsl(${index * 30}, 70%, 50%)`}
                  name={component.name}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (selectedTab === "files" && selectedComponent) {
      const data = getFileScores();
      // Individual file scores for selected component
      return (
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="name"
              width={170}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name, props) => {
                return [`${value}/100`, name];
              }}
              labelFormatter={(label) => {
                const file = data.find((item) => item.name === label);
                return file ? file.filepath : label;
              }}
            />
            <Legend />
            {showScoreBreakdown ? (
              <>
                <Bar
                  dataKey="size"
                  fill="#8884d8"
                  name="Size Score"
                  stackId="stack"
                />
                <Bar
                  dataKey="complexity"
                  fill="#82ca9d"
                  name="Complexity Score"
                  stackId="stack"
                />
                <Bar
                  dataKey="duplication"
                  fill="#ffc658"
                  name="Duplication Score"
                  stackId="stack"
                />
                <Bar
                  dataKey="function_length"
                  fill="#ff8042"
                  name="Function Length Score"
                  stackId="stack"
                />
                <Bar
                  dataKey="comment_density"
                  fill="#0088fe"
                  name="Comment Density Score"
                  stackId="stack"
                />
                <Bar
                  dataKey="naming_convention"
                  fill="#00C49F"
                  name="Naming Convention Score"
                  stackId="stack"
                />
              </>
            ) : (
              <Bar dataKey="score" fill="#8884d8" name="Overall Score" />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }
    
    return <div>Select a component to view file details</div>;
  };

  return (
    <div className="w-full h-full">
      {healthHistory.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No code health history data available
        </div>
      ) : (
        <>{renderChart()}</>
      )}
    </div>
  );
};

export default CodeHealthChart;
