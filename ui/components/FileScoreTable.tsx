import React from "react";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { getScoreColorClass, getChangeIndicator } from "utils/codeHealthUtils";

/**
 * Props for the FileScoreTable component
 */
interface Props {
  files: any[];
  renderMetricBadges: (file: any) => React.ReactNode;
}

/**
 * Component for displaying a table of files with their health scores
 */
const FileScoreTable: React.FC<Props> = ({ 
  files,
  renderMetricBadges
}) => {
  if (!files.length) {
    return <div className="text-sm text-gray-500 py-4">No files to display</div>;
  }

  return (
    <div className="overflow-hidden overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {file.filepath.split('/').pop()}
                <div className="text-xs text-gray-500">{file.filepath}</div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <div className={`text-sm font-medium ${getScoreColorClass(file.score)}`}>
                  {file.score}/100
                  {file.scoreChange !== undefined && (
                    <span className={`ml-2 ${getChangeIndicator(file.scoreChange).class}`} title="Change since last run">
                      {getChangeIndicator(file.scoreChange).icon} {getChangeIndicator(file.scoreChange).label}
                    </span>
                  )}
                </div>
                {renderMetricBadges(file)}
              </td>
              <td className="px-3 py-2">
                {file.issues.length > 0 ? (
                  <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
                    {file.issues.map((issue: string, idx: number) => (
                      <li key={idx}>
                        <div className="flex items-start">
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-500 flex items-center">
                    <InfoIcon className="h-3.5 w-3.5 text-blue-500 mr-1" />
                    No issues found
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileScoreTable;