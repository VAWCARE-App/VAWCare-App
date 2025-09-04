import React, { useEffect, useState } from "react";
import {
  App as AntApp,
  Card,
  Table,
  Typography,
  Tag,
  Layout,
  Button,
  Input,
  Select,
  Space,
  Tooltip,
  Avatar,
  Row,
  Col,
} from "antd";
import { 
  UserOutlined, 
  SafetyOutlined, 
  TeamOutlined, 
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined
} from "@ant-design/icons";
import { api } from "../lib/api";
import Sidebar from "../components/Sidebar";

const { Header, Content } = Layout;
const { Search } = Input;
const { Option } = Select;

export default function UserManagement() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/users");
      
      if (data.success) {
        // Combine all user types with proper formatting
        const formattedUsers = [];
        
        // Add admins
        if (data.data.admins) {
          data.data.admins.forEach(admin => {
            formattedUsers.push({
              key: `admin_${admin._id}`,
              id: admin._id,
              userType: 'admin',
              name: `${admin.firstName} ${admin.middleInitial ? admin.middleInitial + ' ' : ''}${admin.lastName}`,
              email: admin.adminEmail,
              username: admin.adminID,
              role: admin.adminRole,
              status: admin.status,
              isDeleted: admin.isDeleted,
              createdAt: admin.createdAt,
              avatar: admin.firstName?.charAt(0) + admin.lastName?.charAt(0)
            });
          });
        }
        
        // Add victims
        if (data.data.victims) {
          data.data.victims.forEach(victim => {
            formattedUsers.push({
              key: `victim_${victim._id}`,
              id: victim._id,
              userType: 'victim',
              name: `${victim.firstName} ${victim.middleInitial ? victim.middleInitial + ' ' : ''}${victim.lastName}`,
              email: victim.victimEmail || 'N/A',
              username: victim.victimUsername,
              role: victim.victimAccount,
              status: victim.isAnonymous ? 'anonymous' : 'regular',
              isDeleted: victim.isDeleted,
              createdAt: victim.createdAt,
              avatar: victim.firstName?.charAt(0) + victim.lastName?.charAt(0)
            });
          });
        }
        
        // Add officials
        if (data.data.officials) {
          data.data.officials.forEach(official => {
            formattedUsers.push({
              key: `official_${official._id}`,
              id: official._id,
              userType: 'official',
              name: `${official.firstName} ${official.middleInitial ? official.middleInitial + ' ' : ''}${official.lastName}`,
              email: official.officialEmail,
              username: official.officialID,
              role: official.position,
              status: official.status,
              isDeleted: official.isDeleted,
              createdAt: official.createdAt,
              avatar: official.firstName?.charAt(0) + official.lastName?.charAt(0)
            });
          });
        }
        
        setAllUsers(formattedUsers);
        setFilteredUsers(formattedUsers);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    let filtered = allUsers;
    
    // Filter by user type
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.userType === filterType);
    }
    
    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        user.username.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    setFilteredUsers(filtered);
  }, [allUsers, searchText, filterType]);

  const getUserTypeIcon = (type) => {
    switch(type) {
      case 'admin': return <SafetyOutlined style={{ color: '#1890ff' }} />;
      case 'official': return <TeamOutlined style={{ color: '#52c41a' }} />;
      case 'victim': return <UserOutlined style={{ color: '#e91e63' }} />;
      default: return <UserOutlined />;
    }
  };

  const getUserTypeColor = (type) => {
    switch(type) {
      case 'admin': return 'blue';
      case 'official': return 'green';
      case 'victim': return 'pink';
      default: return 'default';
    }
  };

  const getStatusColor = (status, userType) => {
    if (userType === 'victim') {
      return status === 'anonymous' ? 'orange' : 'blue';
    }
    switch(status) {
      case 'approved': return 'green';
      case 'pending': return 'orange';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: getUserTypeColor(record.userType) }}>
            {record.avatar}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>@{record.username}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Type',
      dataIndex: 'userType',
      key: 'userType',
      render: (type) => (
        <Tag icon={getUserTypeIcon(type)} color={getUserTypeColor(type)}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Role/Position',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag>{role}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Tag color={getStatusColor(status, record.userType)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="link" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="Edit User">
            <Button type="link" icon={<EditOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const PINK = "#e91e63";
  const LIGHT_PINK = "#fff0f5";
  const SOFT_PINK = "#ffd1dc";

  const userCounts = {
    total: allUsers.length,
    admins: allUsers.filter(u => u.userType === 'admin').length,
    officials: allUsers.filter(u => u.userType === 'official').length,
    victims: allUsers.filter(u => u.userType === 'victim').length,
  };

  return (
    <Layout style={{ minHeight: "100vh", width: "100vw", background: LIGHT_PINK }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout>
        <Header
          style={{
            background: "#fff",
            borderBottom: `1px solid ${SOFT_PINK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 16,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, color: PINK }}>
            User Management
          </Typography.Title>
          <Button
            onClick={fetchAllUsers}
            icon={<ReloadOutlined />}
            style={{ borderColor: PINK, color: PINK }}
          >
            Refresh
          </Button>
        </Header>

        <Content style={{ padding: 16 }}>
          {/* Summary Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} md={6}>
              <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
                <Typography.Text type="secondary">Total Users</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                  {userCounts.total}
                </Typography.Title>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
                <Typography.Text type="secondary">Administrators</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                  {userCounts.admins}
                </Typography.Title>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
                <Typography.Text type="secondary">Officials</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                  {userCounts.officials}
                </Typography.Title>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}>
                <Typography.Text type="secondary">Victims</Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: PINK }}>
                  {userCounts.victims}
                </Typography.Title>
              </Card>
            </Col>
          </Row>

          {/* Users Table */}
          <Card
            title="All Users"
            style={{ border: `1px solid ${SOFT_PINK}`, borderRadius: 12 }}
            extra={
              <Space>
                <Search
                  placeholder="Search users..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  style={{ width: 250 }}
                  onSearch={setSearchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 150 }}
                >
                  <Option value="all">All Types</Option>
                  <Option value="admin">Administrators</Option>
                  <Option value="official">Officials</Option>
                  <Option value="victim">Victims</Option>
                </Select>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={filteredUsers}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} users`,
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}