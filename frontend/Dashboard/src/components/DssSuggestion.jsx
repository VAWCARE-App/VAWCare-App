import React, { useEffect, useState } from 'react';
import { Card, Spin, Typography, Button, Tag, message, Collapse, Space, Divider, Alert } from 'antd';
import { WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, ClockCircleOutlined, HeartOutlined, ThunderboltOutlined, SmileOutlined, DollarOutlined } from '@ant-design/icons';
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
        // Always call the DSS API so keyword-based suggestions are returned live.
        const payload = {
          incidentType: caseData.incidentType,
          description: caseData.description,
          assignedOfficer: caseData.assignedOfficer,
          status: caseData.status,
          perpetrator: caseData.perpetrator,
          victimId: caseData.victim || caseData.victimId || caseData.reportedBy,
          // include victimType so DSS can tailor suggestions for Child vs Woman
          victimType: caseData.victimType || null,
          // include explicit riskLevel only if this was a manual override (so DSS can respect it)
          riskLevel: caseData.dssManualOverride ? (caseData.riskLevel || null) : null
        };
        const res = await api.post('/api/dss/suggest', payload);
        console.log('DSS Response:', res.data.data);
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

  // Small mapping for label color + icon
  const labelMeta = {
    Sexual: { color: 'magenta', icon: <HeartOutlined /> },
    Physical: { color: 'purple', icon: <ThunderboltOutlined /> },
    Psychological: { color: 'blue', icon: <SmileOutlined /> },
    Economic: { color: 'gold', icon: <DollarOutlined /> }
  };

  return (
    <Card title="DSS Suggestion" style={{ marginTop: 16 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      ) : result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Immediate Action Alert */}
          {result.requiresImmediateAssistance && (
            <Alert
              message="URGENT: Immediate Action Required"
              description={
                <Typography.Text strong style={{ color: '#cf1322' }}>
                  This is a high-risk case requiring immediate intervention and response. 
                  Prioritize victim safety and immediate protective measures.
                </Typography.Text>
              }
              type="error"
              showIcon
              icon={<WarningOutlined style={{ fontSize: '24px' }} />}
              banner
              style={{
                backgroundColor: '#fff1f0',
                borderColor: '#ff4d4f',
                padding: '12px'
              }}
            />
          )}

          {/* Risk Assessment Section */}
          <Card type="inner" title={
            <Space>
              <WarningOutlined style={{ color: '#cf1322' }} />
              Risk Assessment
            </Space>
          }>
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* Risk Level Indicators */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <Typography.Text strong>Case Type: </Typography.Text>
                  <Tag color={
                    result.predictedRisk === 'Sexual' ? 'magenta' :
                    result.predictedRisk === 'Physical' ? 'purple' :
                    result.predictedRisk === 'Psychological' ? 'blue' :
                    'orange'
                  } style={{ 
                    padding: '4px 12px', 
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {result.predictedRisk}
                  </Tag>
                </div>
                <div>
                  <Typography.Text strong>Risk Level: </Typography.Text>
                  <div style={{ display: 'inline-block', marginLeft: 8 }}>
                    {result.requiresImmediateAssistance || result.riskLevel === 'High' ? (
                      <Tag
                        style={{ 
                          backgroundColor: '#ff4d4f',
                          color: 'white',
                          padding: '4px 12px', 
                          fontSize: '14px',
                          fontWeight: 'bold',
                          border: 'none'
                        }}>
                        HIGH RISK
                      </Tag>
                    ) : result.riskLevel === 'Medium' ? (
                      <Tag
                        style={{ 
                          backgroundColor: '#faad14',
                          color: 'black',
                          padding: '4px 12px', 
                          fontSize: '14px',
                          fontWeight: 'bold',
                          border: 'none'
                        }}>
                        MEDIUM RISK
                      </Tag>
                    ) : (
                      <Tag
                        style={{ 
                          backgroundColor: '#52c41a',
                          color: 'white',
                          padding: '4px 12px', 
                          fontSize: '14px',
                          fontWeight: 'bold',
                          border: 'none'
                        }}>
                        LOW RISK
                      </Tag>
                    )}
                    {(result.requiresImmediateAssistance || result.riskLevel === 'High') && (
                      <Tag 
                        style={{ 
                          marginLeft: 8,
                          backgroundColor: '#ff4d4f',
                          color: 'white',
                          border: 'none'
                        }}>
                        <WarningOutlined /> IMMEDIATE ACTION
                      </Tag>
                    )}
                  </div>
                </div>
              </div>

              {/* Detection Method(s) — show all sources so staff see what contributed */}
              <div>
                <Typography.Text type="secondary">Detection Method:</Typography.Text>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* Primary detection method tag (friendly) */}
                  {(() => {
                    const dmRaw = String(result.detectionMethod || '').trim();
                    if (dmRaw === 'manual_override') return <Tag color="volcano" icon={<InfoCircleOutlined />}>Manual override</Tag>;
                    if (dmRaw.startsWith('ml_high_confidence')) {
                      const parts = dmRaw.split(':');
                      return <Tag color="geekblue" icon={<ThunderboltOutlined />}>ML (high confidence): {parts[1] || ''}</Tag>;
                    }
                    if (dmRaw.startsWith('rule_engine:')) {
                      const parts = dmRaw.split(':');
                      return <Tag color="purple" icon={<CheckCircleOutlined />}>Rule Engine: {parts[1] || ''}</Tag>;
                    }
                    if (dmRaw === 'heuristic') return <Tag color="default">Heuristic</Tag>;
                    return null;
                  })()}

                  {/* Explicit extra sources (always show when present) */}
                  {result.dssManualOverride && result.detectionMethod !== 'manual_override' && (
                    <Tag color="volcano" icon={<InfoCircleOutlined />}>Manual override</Tag>
                  )}

                  {result.mlPrediction && result.mlPrediction.risk && (
                    <Tag color="geekblue" icon={<ThunderboltOutlined />}>ML: {result.mlPrediction.risk} ({Math.round((result.mlPrediction.confidence || 0) * 100)}%)</Tag>
                  )}

                  {result.dssRuleMatched && result.dssChosenRule && !(String(result.detectionMethod || '').startsWith('rule_engine:')) && (
                    <Tag color="purple" icon={<CheckCircleOutlined />}>Rule Engine: {result.dssChosenRule.type || result.ruleDetails?.type}</Tag>
                  )}

                  {result.matchedKeyword && (
                    <Tag color="magenta" icon={<InfoCircleOutlined />}>Keyword: {result.matchedKeyword}</Tag>
                  )}
                </div>
              </div>
            </Space>
          </Card>

          {/* Action Recommendation Section */}
          <Card type="inner" title={
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              Recommended Actions
            </Space>
          }>
            <Typography.Paragraph style={{ 
              whiteSpace: 'pre-line', 
              fontSize: '14px',
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: 0
            }}>
              {result.suggestion}
            </Typography.Paragraph>
          </Card>

          {/* Probability breakdown removed: DSS no longer returns probability vectors */}

          {/* Administrative Actions */}
          {userType === 'admin' && (
            <>
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Typography.Text type="secondary">
                  <ClockCircleOutlined /> Administrative Actions
                </Typography.Text>
                <Space>
                  <Button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const res = await api.post('/api/dss/train');
                        message.success(res.data.message || 'Training triggered');
                      } catch (e) {
                        message.error('Training failed');
                      } finally { setLoading(false); }
                    }} 
                    type="default"
                    icon={<InfoCircleOutlined />}
                  >
                    Retrain Model
                  </Button>
                </Space>
              </Space>
            </>
          )}

          {/* Debug Information */}
          {result.ruleMatched && result.ruleEvent && (userType === 'admin' || userType === 'official') && (
            <Collapse ghost>
              <Collapse.Panel 
                header={<Typography.Text type="secondary">Technical Details</Typography.Text>} 
                key="1"
              >
                <pre style={{ 
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f6f8fa',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(result.ruleEvent.params, null, 2)}
                </pre>
              </Collapse.Panel>
            </Collapse>
          )}
        </div>
      ) : (
        <Typography.Text type="secondary">No suggestion available</Typography.Text>
      )}
    </Card>
  );
}
