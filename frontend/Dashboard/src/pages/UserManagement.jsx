import React, { useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Layout,
  Grid,
} from "antd";
import { api } from "../lib/api";
import Sidebar from "../components/Sidebar";

const { Header, Content } = Layout;

export default function UserManagement() {
  const { message, modal, notification } = AntApp.useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [collapsed, setCollapsed] = useState(false);
  const screens = Grid.useBreakpoint();

  const PINK = "#e91e63";
  const LIGHT_PINK = "#fff0f5";
  const SOFT_PINK = "#ffd1dc";

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/users");
      setUsers(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const openCreate = () => {
    setEditing({ id: "new", name: "", email: "", role: "user", active: true });
    form.setFieldsValue({ name: "", email: "", role: "user", active: true });
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
  };

  const submitForm = async () => {
    try {
      const values = await form.validateFields();
      if (editing?.id === "new") {
        const { data } = await api.post("/api/users", values);
        notification.success({ message: "User created" });
        setUsers((prev) => [data, ...prev]);
      } else {
        const { data } = await api.put(`/api/users/${editing.id}`, values);
        notification.success({ message: "User updated" });
        setUsers((prev) => prev.map((u) => (u.id === editing.id ? data : u)));
      }
      setEditing(null);
      form.resetFields();
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || "Save failed");
    }
  };

  const confirmDelete = (record) => {
    modal.confirm({
      title: "Delete user",
      content: `Are you sure you want to delete "${record.name}"?`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/api/users/${record.id}`);
          message.success("Deleted");
          setUsers((prev) => prev.filter((u) => u.id !== record.id));
        } catch (err) {
          message.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (t) => <Typography.Text strong>{t}</Typography.Text>,
    },
    { title: "Email", dataIndex: "email" },
    {
      title: "Role",
      dataIndex: "role",
      filters: [
        { text: "admin", value: "admin" },
        { text: "staff", value: "staff" },
        { text: "user", value: "user" },
      ],
      onFilter: (v, r) => r.role === v,
      render: (role) => <Tag color={PINK}>{role || "user"}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "active",
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (v, r) => r.active === v,
      render: (active) => <Tag color={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button onClick={() => openEdit(record)} style={{ borderColor: PINK, color: PINK }}>Edit</Button>
          <Button danger onClick={() => confirmDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", width:"100vw", background: LIGHT_PINK }}>
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
          <Space>
            <Input.Search
              allowClear
              placeholder="Search users"
              style={{ width: 260, paddingTop: 16, paddingRight: 10
               }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="primary" style={{ background: PINK, borderColor: PINK, borderRadius: 10, fontWeight: 600 }} onClick={openCreate}>
              New User
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 16 }}>
          <Card
            style={{
              border: `1px solid ${SOFT_PINK}`,
              borderRadius: 12,
              background: "#fff",
              boxShadow: "0 20px 34px rgba(0,0,0,0.06)",
            }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              rowKey={(r) => String(r.id)}
              columns={columns}
              dataSource={filtered}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              style={{ padding: 16 }}
            />
          </Card>
          <Modal
            open={!!editing}
            onCancel={() => setEditing(null)}
            onOk={submitForm}
            title={editing?.id === "new" ? "Create User" : "Edit User"}
            okText={editing?.id === "new" ? "Create" : "Save"}
          >
            <Form form={form} layout="vertical">
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input placeholder="Full name" />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
                <Input placeholder="you@example.com" />
              </Form.Item>
              <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                <Input list="roleOptions" placeholder="admin / staff / user" />
                <datalist id="roleOptions">
                  <option value="admin" />
                  <option value="staff" />
                  <option value="user" />
                </datalist>
              </Form.Item>
              <Form.Item name="active" label="Active" rules={[{ required: true }]}>
                <Input list="activeOptions" placeholder="true / false" />
                <datalist id="activeOptions">
                  <option value="true" />
                  <option value="false" />
                </datalist>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
