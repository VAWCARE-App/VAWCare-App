import React from 'react';
import { Button, Typography, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../../lib/api';

export default function VictimDashboard() {
  const navigate = useNavigate();

	const handleLogout = () => {
		clearToken();
		localStorage.removeItem('user');
		localStorage.removeItem('userType');
		navigate('/login');
	};

	return (
		<div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
			<Card style={{ width: 760, textAlign: 'center' }}>
				<Typography.Title level={3}>Victim Dashboard (Test)</Typography.Title>
				<Typography.Paragraph>
					This is a simple landing page for Victims used for testing.
				</Typography.Paragraph>
				<Button type="primary" onClick={handleLogout}>Logout</Button>
			</Card>
		</div>
	);
}
