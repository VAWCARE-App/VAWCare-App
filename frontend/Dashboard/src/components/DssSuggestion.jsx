import React, { useEffect, useState } from 'react';
import { Card, Spin, Typography, Button, Tag, message } from 'antd';
import { api } from '../lib/api';

export default function DssSuggestion({ caseData }) {
  const userType = localStorage.getItem('userType') || 'victim';
  if (userType !== 'admin' && userType !== 'official') return null;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!caseData) return;
    const fetchSuggestion = async () => {
      setLoading(true);
      try {
        const payload = {
          incidentType: caseData.incidentType,
          description: caseData.description,
          assignedOfficer: caseData.assignedOfficer,
          status: caseData.status,
          perpetrator: caseData.perpetrator,
        };
        const res = await api.post('/api/dss/suggest', payload);
        setResult(res.data.data);
      } catch (err) {
        console.warn('DSS suggestion failed', err?.response?.data || err.message);
        message.error('DSS suggestion unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestion();
  }, [caseData]);

  return (
    <Card title="DSS Suggestion" style={{ marginTop: 16 }}>
      {loading ? (
        <Spin />
      ) : result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <Typography.Text strong>Predicted Risk: </Typography.Text>
            <Tag color={result.predictedRisk === 'Sexual' ? 'red' : result.predictedRisk === 'Physical' ? 'orange' : result.predictedRisk === 'Psychological' ? 'geekblue' : 'green'}>
              {result.predictedRisk}
            </Tag>
          </div>
          <div>
            <Typography.Text strong>Requires immediate assistance: </Typography.Text>
            <Tag color={result.requiresImmediateAssistance ? 'red' : 'green'}>
              {result.requiresImmediateAssistance ? 'Yes' : 'No'}
            </Tag>
            {/* short guidance removed per request */}
          </div>
          <div>
            <Typography.Text strong>Suggestion: </Typography.Text>
            <Typography.Paragraph>{result.suggestion}</Typography.Paragraph>
          </div>
          {/* Per-class probabilities hidden by request */}
          <div style={{ marginTop: 6 }}>
            <Button onClick={async () => {
              setLoading(true);
              try {
                const res = await api.post('/api/dss/train');
                message.success(res.data.message || 'Training triggered');
              } catch (e) {
                message.error('Training failed');
              } finally { setLoading(false); }
            }} type="default">Retrain Model</Button>
          </div>
        </div>
      ) : (
        <Typography.Text type="secondary">No suggestion available</Typography.Text>
      )}
    </Card>
  );
}
