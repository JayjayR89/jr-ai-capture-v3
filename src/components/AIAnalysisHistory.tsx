import React from 'react';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AnalysisRecord {
  image: {
    dataUrl: string;
    timestamp: Date;
  };
  prompt: string;
  description: string;
}

interface AIAnalysisHistoryProps {
  history: AnalysisRecord[];
}

const AIAnalysisHistory: React.FC<AIAnalysisHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <Card className="p-4 mt-4">
        <p className="text-sm text-muted-foreground">No analysis history yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 mt-4">
      <h3 className="text-lg font-semibold mb-2">AI Analysis History</h3>
      <Accordion type="single" collapsible className="w-full">
        {history.map((record, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger>
              <div className="flex items-center gap-4">
                <img src={record.image.dataUrl} alt="Analyzed" className="w-12 h-12 object-cover rounded-lg" />
                <div>
                  <p className="text-sm font-medium">Analysis from {record.image.timestamp.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-xs">{record.description}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Prompt:</h4>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{record.prompt}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Description:</h4>
                  <p className="text-sm p-2 bg-muted rounded-md">{record.description}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
};

export default AIAnalysisHistory;
