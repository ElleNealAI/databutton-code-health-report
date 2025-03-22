/**
 * Utility functions for the Code Health feature
 * 
 * This file contains reusable functions for analyzing and displaying
 * code health metrics throughout the application.
 */

/**
 * Get color text class based on a score value
 * @param score - Numeric score (0-100)
 * @returns Tailwind text color class based on score threshold
 */
export const getScoreColorClass = (score: number): string => {
    if (score < 70) return "text-red-600";
    if (score < 85) return "text-yellow-600";
    return "text-green-600";
  };
  
  /**
   * Get background color class based on a score value
   * @param score - Numeric score (0-100)
   * @returns Tailwind background color class based on score threshold
   */
  export const getScoreBgClass = (score: number): string => {
    if (score < 70) return "bg-red-100 text-red-600";
    if (score < 85) return "bg-yellow-100 text-yellow-600";
    return "bg-green-100 text-green-600";
  };
  
  /**
   * Get change indicator info based on score change
   * @param change - Numeric change value (can be positive, negative, or zero)
   * @returns Object with icon, CSS class, and formatted label
   */
  export const getChangeIndicator = (change: number) => {
    if (change > 0) return { icon: "↑", class: "text-green-600", label: `+${change}` };
    if (change < 0) return { icon: "↓", class: "text-red-600", label: change.toString() };
    return { icon: "→", class: "text-gray-400", label: "0" };
  };
  
  /**
   * Calculate the average score for a file based on all metrics
   * @param file - File object containing individual metric scores
   * @returns Rounded average score (0-100)
   */
  export const calculateFileAvgScore = (file: any): number => {
    return Math.round(
      (file.size_score + 
       file.complexity_score + 
       file.duplication_score + 
       file.function_length_score + 
       file.comment_density_score + 
       file.naming_convention_score) / 6
    );
  };
  
  /**
   * Group files by their type based on filepath
   * @param filepath - File path string to categorize
   * @returns Category name for the file
   */
  export const categorizeFileByPath = (filepath: string): string => {
    if (filepath.includes('/pages/')) {
      return "Pages";
    } else if (filepath.includes('/components/')) {
      return "Components";
    } else if (filepath.includes('/utils/') || filepath.includes('/src/utils/')) {
      return "UI Files";
    } else if (filepath.includes('/apis/') || filepath.includes('/api/')) {
      return "API Files";
    } else {
      return "Other";
    }
  };
  
  /**
   * Process file data to extract useful metrics and add comparison info
   * @param currentFiles - Current files data array
   * @param previousFiles - Previous files data array (optional)
   * @returns Processed file data with scores and change metrics
   */
  export const processFilesData = (currentFiles: any[], previousFiles?: any[]) => {
    // Track previous scores by filepath for comparison
    const previousScores: Record<string, number> = {};
    
    if (previousFiles) {
      previousFiles.forEach(file => {
        const avgScore = calculateFileAvgScore(file);
        previousScores[file.filepath] = avgScore;
      });
    }
    
    return currentFiles.map(file => {
      // Calculate average score
      const avgScore = calculateFileAvgScore(file);
      
      // Calculate score change
      const previousScore = previousScores[file.filepath] || avgScore;
      const scoreChange = avgScore - previousScore;
      
      return {
        filepath: file.filepath,
        score: avgScore,
        previousScore,
        scoreChange,
        issues: file.issues,
        details: {
          size: file.size_score,
          complexity: file.complexity_score,
          duplication: file.duplication_score,
          function_length: file.function_length_score,
          comment_density: file.comment_density_score,
          naming_convention: file.naming_convention_score
        }
      };
    });
  };
  