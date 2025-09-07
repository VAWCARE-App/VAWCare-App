import React from 'react';
import { Button, Typography, Card } from 'antd';
import { clearToken } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export default function OfficialDashboard() {
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
				<Typography.Title level={3}>Official Dashboard (Test)</Typography.Title>
				<Typography.Paragraph>
					This is a simple landing page for barangay officials used for testing. 
				</Typography.Paragraph>
				<Button type="primary" onClick={handleLogout}>Logout</Button>
			</Card>
		</div>
	);
}
