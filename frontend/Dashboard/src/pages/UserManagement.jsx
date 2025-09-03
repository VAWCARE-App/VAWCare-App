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
} from "antd";
import { api } from "../lib/api";

export default function UserManagement() {
  const { message, modal, notification } = AntApp.useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/users"); // Expect [{ id, name, email, role, createdAt, active }]
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
      render: (role) => <Tag>{role || "user"}</Tag>,
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
          <Button onClick={() => openEdit(record)}>Edit</Button>
          <Button danger onClick={() => confirmDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="User Management" extra={
      <Space>
        <Input.Search
          allowClear
          placeholder="Search users"
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="primary" onClick={openCreate}>New User</Button>
      </Space>
    }>
      <Table
        rowKey={(r) => String(r.id)}
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />

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
    </Card>
  );
}
