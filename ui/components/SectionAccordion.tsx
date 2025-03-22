import React from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { getScoreColorClass, getChangeIndicator } from "utils/codeHealthUtils";
import FileScoreTable from "components/FileScoreTable";

/**
 * Props for the SectionAccordion component
 */
interface Props {
  sections: Record<string, any[]>;
  renderMetricBadges: (file: any) => React.ReactNode;
}

/**
 * Component for displaying sections of files in collapsible accordions
 */
const SectionAccordion: React.FC<Props> = ({ 
  sections,
  renderMetricBadges
}) => {
  return (
    <Accordion.Root type="single" collapsible className="space-y-4">
      {Object.entries(sections).map(([section, files]) => {
        if (files.length === 0) return null;
        
        // Calculate section average score and change
        const sectionAvgScore = Math.round(
          files.reduce((sum, file) => sum + file.score, 0) / files.length
        );
        
        const sectionAvgPrevScore = Math.round(
          files.reduce((sum, file) => sum + (file.previousScore || file.score), 0) / files.length
        );
        
        const sectionScoreChange = sectionAvgScore - sectionAvgPrevScore;
        const changeIndicator = getChangeIndicator(sectionScoreChange);
        
        return (
          <Accordion.Item 
            key={section} 
            value={section}
            className="border rounded-lg overflow-hidden"
          >
            <Accordion.Trigger className="flex justify-between items-center w-full p-4 bg-gray-50 hover:bg-gray-100 text-left">
              <div className="flex items-center">
                <span className="text-lg font-medium">{section}</span>
                <span className="ml-2 text-sm text-gray-500">({files.length} files)</span>
                <div className={`ml-4 text-lg font-bold ${getScoreColorClass(sectionAvgScore)}`}>
                  Score: {sectionAvgScore}/100
                  <span className={`ml-2 ${changeIndicator.class}`} title="Change since last run">
                    {changeIndicator.icon} {changeIndicator.label}
                  </span>
                </div>
              </div>
              <ChevronDownIcon className="h-5 w-5 transition-transform duration-200 ease-in-out data-[state=open]:rotate-180" />
            </Accordion.Trigger>
            
            <Accordion.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden">
              <div className="p-4">
                <FileScoreTable 
                  files={files}
                  renderMetricBadges={renderMetricBadges}
                />
              </div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
};

export default SectionAccordion;