// src/pages/admin/UserManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Avatar,
  Modal,
  Form,
  Row,
  Col,
  Grid,
  DatePicker,
  Descriptions,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DownloadOutlined,
  CalendarOutlined,
  MailOutlined,
  IdcardOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { RangePicker } = DatePicker;

export default function UserManagement() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm; // very small phones
  const isSm = !!screens.sm && !screens.md; // small
  const isMdUp = !!screens.md; // tablet and up
  const HEADER_H = isXs ? 56 : isMdUp ? 72 : 64;

  // Brand (matches Alerts/other updated pages)
  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    green: "#52c41a",
    blue: "#1890ff",
    pageBg: "linear-gradient(180deg, #faf9ff 0%, #f6f3ff 60%, #ffffff 100%)",
    softBorder: "rgba(122,90,248,0.18)",
    rowHover: "#F1EEFF",
  };
  const glassCard = {
    borderRadius: 14,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${BRAND.softBorder}`,
    boxShadow: "0 10px 26px rgba(16,24,40,0.06)",
  };

  // Layout sizing
  const [tableY, setTableY] = useState(520);
  const pageRef = useRef(null);

  useEffect(() => {
    const calc = () => {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      // available height below content top, minus small buffer
      const available = window.innerHeight - rect.top - 16;
      const y = Math.max(240, available - 220); // accounts for cards/toolbars inside content
      setTableY(y);

      pageRef.current.style.width = "100%";
      pageRef.current.style.minWidth = "0";
    };

    calc();
    window.addEventListener("resize", calc);

    const ro = new ResizeObserver(calc);
    ro.observe(document.body);

    const t = setTimeout(calc, 50);
    return () => {
      window.removeEventListener("resize", calc);
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  // State
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  // Modal (right-side)
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("view"); // view | edit
  const [activeUser, setActiveUser] = useState(null);
  const [form] = Form.useForm();

  // Fetch users
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/users");
      if (data.success) {
        const formatted = [];
        data.data.admins?.forEach((a) =>
          formatted.push({
            key: `admin_${a._id}`,
            id: a._id,
            userType: "admin",
            firstName: a.firstName,
            middleInitial: a.middleInitial,
            lastName: a.lastName,
            name: `${a.firstName} ${a.middleInitial ? a.middleInitial + " " : ""}${a.lastName}`,
            email: a.adminEmail,
            username: a.adminID,
            role: a.adminRole,
            status: a.status,
            isDeleted: a.isDeleted,
            createdAt: a.createdAt,
            avatar: (a.firstName?.[0] || "") + (a.lastName?.[0] || ""),
          })
        );
        data.data.victims?.forEach((v) =>
          formatted.push({
            key: `victim_${v._id}`,
            id: v._id,
            userType: "victim",
            firstName: v.firstName,
            middleInitial: v.middleInitial,
            lastName: v.lastName,
            name: `${v.firstName} ${v.middleInitial ? v.middleInitial + " " : ""}${v.lastName}`,
            email: v.victimEmail || "N/A",
            username: v.victimUsername,
            role: v.victimAccount,
            status: v.isAnonymous ? "anonymous" : "regular",
            isDeleted: v.isDeleted,
            createdAt: v.createdAt,
            avatar: (v.firstName?.[0] || "") + (v.lastName?.[0] || ""),
          })
        );
        data.data.officials?.forEach((o) =>
          formatted.push({
            key: `official_${o._id}`,
            id: o._id,
            userType: "official",
            firstName: o.firstName,
            middleInitial: o.middleInitial,
            lastName: o.lastName,
            name: `${o.firstName} ${o.middleInitial ? o.middleInitial + " " : ""}${o.lastName}`,
            email: o.officialEmail,
            username: o.officialID,
            role: o.position,
            status: o.status,
            isDeleted: o.isDeleted,
            createdAt: o.createdAt,
            avatar: (o.firstName?.[0] || "") + (o.lastName?.[0] || ""),
          })
        );
        setAllUsers(formatted);
        setFilteredUsers(formatted);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Open right modal
  const openModalFor = (record, m = "view") => {
    setActiveUser(record);
    setMode(m);
    form.setFieldsValue({
      firstName: record.firstName || record.name.split(" ")[0] || "",
      middleInitial: record.middleInitial || "",
      lastName: record.lastName || record.name.split(" ").slice(1).join(" ") || "",
      email: record.email === "N/A" ? "" : record.email,
      role: record.role,
      status: record.status,
    });
    setModalOpen(true);
  };

  // Helpers
  const getStatusColor = (status, userType) => {
    if (userType === "victim") return status === "anonymous" ? "orange" : "blue";
    switch (status) {
      case "approved":
        return "green";
      case "pending":
        return "orange";
      case "rejected":
        return "red";
      default:
        return "default";
    }
  };
  const typePillBg = (type) =>
    type === "admin" ? "#e9f3ff" : type === "official" ? "#e9f9e6" : "#ffe9f0";

  const handleUpdateUser = async (values) => {
    try {
      const record = activeUser;
      const path =
        record.userType === "admin"
          ? "admins"
          : record.userType === "official"
          ? "officials"
          : "victims";

      let payload = {};
      if (record.userType === "admin") {
        payload = {
          firstName: values.firstName,
          lastName: values.lastName,
          adminEmail: values.email,
          adminRole: values.role,
          status: values.status,
        };
      } else if (record.userType === "official") {
        payload = {
          firstName: values.firstName,
          lastName: values.lastName,
          officialEmail: values.email,
          position: values.role,
          status: values.status,
        };
      } else {
        payload = { firstName: values.firstName, lastName: values.lastName };
        if (values.role !== "anonymous" && values.email && values.email.trim() !== "")
          payload.victimEmail = values.email;
      }
      Object.keys(payload).forEach((k) => {
        if (
          payload[k] === undefined ||
          (typeof payload[k] === "string" && payload[k].trim() === "")
        )
          delete payload[k];
      });

      const res = await api.put(`/api/admin/${path}/${record.id}`, payload);
      if (res?.data?.success) {
        message.success("User updated");
        setMode("view");
        fetchAllUsers();
      } else {
        message.error(res?.data?.message || "Failed to update user");
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || err.message || "Failed to update user"
      );
    }
  };

  const handleDeleteUser = async () => {
    if (!activeUser) return;
    try {
      setLoading(true);
      const path =
        activeUser.userType === "admin"
          ? "admins"
          : activeUser.userType === "official"
          ? "officials"
          : "victims";
      const res = await api.put(`/api/admin/${path}/soft-delete/${activeUser.id}`);
      if (res?.data?.success) {
        message.success("User soft-deleted");
        setModalOpen(false);
        fetchAllUsers();
      } else {
        message.error(res?.data?.message || "Failed to delete user");
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || err.message || "Failed to delete user"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  useEffect(() => {
    let filtered = [...allUsers];
    if (filterType !== "all") filtered = filtered.filter((u) => u.userType === filterType);
    if (filterStatus !== "all")
      filtered = filtered.filter(
        (u) => String(u.status).toLowerCase() === filterStatus
      );
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter((u) => {
        const t = new Date(u.createdAt).getTime();
        return (
          t >= start.startOf("day").valueOf() && t <= end.endOf("day").valueOf()
        );
      });
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q)
      );
    }
    setFilteredUsers(filtered);
  }, [allUsers, searchText, filterType, filterStatus, dateRange]);

  // Columns (keep left fixed & clickable)
  const columns = useMemo(
    () => [
      {
        title: "User",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        width: 260,
        render: (text, record) => (
          <Space>
            <Avatar style={{ background: typePillBg(record.userType), color: "#444" }}>
              {record.avatar}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700 }}>{text}</div>
              <div style={{ fontSize: 12, color: "#999" }}>@{record.username}</div>
            </div>
          </Space>
        ),
        onCell: (record) => ({
          onClick: () => openModalFor(record, "view"),
          style: { cursor: "pointer" },
        }),
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        ellipsis: true,
        width: 260,
        responsive: ["sm"],
      },
      {
        title: "Type",
        dataIndex: "userType",
        key: "userType",
        width: 120,
        render: (t) => <Tag style={{ borderRadius: 999 }}>{t}</Tag>,
        responsive: ["md"],
      },
      {
        title: "Role/Position",
        dataIndex: "role",
        key: "role",
        width: 160,
        render: (r) => <Tag style={{ borderRadius: 999 }}>{r}</Tag>,
        responsive: ["lg"],
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (s, r) => (
          <Tag color={getStatusColor(s, r.userType)} style={{ borderRadius: 999 }}>
            {String(s).charAt(0).toUpperCase() + String(s).slice(1)}
          </Tag>
        ),
        responsive: ["sm"],
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 180,
        render: (d) => (d ? new Date(d).toLocaleString() : "-"),
        responsive: ["xl"],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screens.xs, screens.sm, screens.md, screens.lg, screens.xl]
  );

  // Metrics
  const userCounts = useMemo(
    () => ({
      total: allUsers.length,
      admins: allUsers.filter((u) => u.userType === "admin").length,
      officials: allUsers.filter((u) => u.userType === "official").length,
      victims: allUsers.filter((u) => u.userType === "victim").length,
    }),
    [allUsers]
  );

  // Export CSV
  const exportCsv = () => {
    const rows = filteredUsers.map((u) => ({
      Name: u.name,
      Username: u.username,
      Email: u.email,
      Type: u.userType,
      Role: u.role,
      Status: u.status,
      CreatedAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    }));
    const header = "Name,Username,Email,Type,Role,Status,CreatedAt";
    const body = rows
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalWidth = screens.xl ? 700 : screens.lg ? 660 : screens.md ? "92vw" : "96vw";

  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "hidden",
      }}
    >
      {/* Sticky responsive header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: BRAND.pageBg,
          borderBottom: `1px solid ${BRAND.softBorder}`,
          display: "flex",
          alignItems: "center",
          paddingInline: screens.md ? 20 : 12,
          height: screens.xs && !screens.sm ? 64 : 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* Sidebar toggle only on phones & small screens (dispatches existing toggle event Sidebar listens for) */}
          {!screens.md && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: screens.md ? 40 : 36,
                height: screens.md ? 40 : 36,
                display: "grid",
                placeItems: "center",
                borderRadius: 10,
                background: "#ffffffcc",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Typography.Title
              level={4}
              style={{
                margin: 0,
                color: BRAND.violet,
              }}
            >
              User Management
            </Typography.Title>
            {screens.md && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Review, filter, and manage all users across roles and accounts.
              </Typography.Text>
            )}
          </div>
        </div>
      </Header>

      <Content
        ref={pageRef}
        style={{
          padding: 12,
          width: "100%",
          minWidth: 0,
          marginLeft: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingInline: screens.xs ? 6 : 12,
            transition: "width .25s ease",
            boxSizing: "border-box",
          }}
        >
          {/* KPIs */}
          <Row gutter={[10, 10]}>
            {[
              ["Total Users", userCounts.total, BRAND.violet],
              ["Administrators", userCounts.admins, BRAND.blue],
              ["Officials", userCounts.officials, BRAND.green],
              ["Victims", userCounts.victims, BRAND.pink],
            ].map(([label, value, color], i) => (
              <Col xs={12} md={6} key={i}>
                <Card style={{ ...glassCard, padding: 10 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {label}
                  </Typography.Text>
                  <Typography.Title
                    level={3}
                    style={{ margin: 0, color, fontSize: 24 }}
                  >
                    {value}
                  </Typography.Title>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Toolbar */}
          <Card style={{ ...glassCard, padding: 10 }}>
            <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Space wrap size={8}>
                <Search
                  placeholder="Search name, email, username…"
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="middle"
                  style={{ width: screens.xs ? "100%" : screens.sm ? 200 : 220, minWidth: screens.xs ? 200 : undefined }}
                  value={searchText}
                  onSearch={setSearchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  size="middle"
                  style={{ width: screens.xs ? 150 : 170 }}
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "admin", label: "Administrators" },
                    { value: "official", label: "Officials" },
                    { value: "victim", label: "Victims" },
                  ]}
                />
                <Select
                  value={filterStatus}
                  onChange={setFilterStatus}
                  size="middle"
                  style={{ width: screens.xs ? 150 : 170 }}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "approved", label: "Approved" },
                    { value: "pending", label: "Pending" },
                    { value: "rejected", label: "Rejected" },
                    { value: "anonymous", label: "Anonymous" },
                    { value: "regular", label: "Regular" },
                  ]}
                />
                <RangePicker
                  onChange={setDateRange}
                  allowEmpty={[true, true]}
                  placeholder={["Start", "End"]}
                  suffixIcon={<CalendarOutlined />}
                  size="middle"
                  style={{ width: screens.xs ? 220 : 260 }}
                />
              </Space>
              <Space size={8}>
                <Button icon={<ReloadOutlined />} onClick={fetchAllUsers} size="middle" />
                <Button icon={<DownloadOutlined />} onClick={exportCsv} size="middle">
                  Export
                </Button>
              </Space>
            </Space>
          </Card>

          {/* Table */}
          <Card style={{ ...glassCard, padding: 0 }}>
            <Table
              columns={columns}
              dataSource={filteredUsers}
              loading={loading}
              size="middle"
              sticky
              rowKey="key"
              pagination={false}
              tableLayout="fixed"
              scroll={{ y: tableY, x: "max-content" }}
              onRow={(record) => ({
                onClick: () => openModalFor(record, "view"),
                style: { cursor: "pointer" },
              })}
              rowClassName={(record) =>
                activeUser?.key === record.key ? "is-active" : ""
              }
            />
          </Card>
        </div>

        {/* RIGHT-SIDE FLOATING MODAL */}
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          centered={false}
          width={modalWidth}
          wrapClassName="floating-side"
          className="floating-modal"
          maskStyle={{
            backdropFilter: "blur(2px)",
            background: "rgba(17,17,26,0.24)",
          }}
          getContainer={false}
          styles={{ body: { padding: 12 } }}
          title={
            activeUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Space>
                  <Avatar
                    style={{ background: typePillBg(activeUser.userType), color: "#444" }}
                  >
                    {activeUser.avatar}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {activeUser.name} <Tag style={{ marginLeft: 6 }}>{activeUser.userType}</Tag>
                    </div>
                    <Typography.Text type="secondary">@{activeUser.username}</Typography.Text>
                  </div>
                </Space>
                <Space>
                  {mode === "view" ? (
                    <Button
                      type="primary"
                      onClick={() => setMode("edit")}
                      icon={<EditOutlined />}
                      style={{ background: BRAND.violet, borderColor: BRAND.violet }}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button onClick={() => setMode("view")}>Cancel</Button>
                  )}
                  <Button danger onClick={handleDeleteUser}>Delete</Button>
                </Space>
              </div>
            ) : (
              "User"
            )
          }
        >
          {activeUser && (
            <div className="modal-inner-animate">
              {/* Details */}
              <Card style={{ ...glassCard, borderRadius: 16, marginBottom: 12 }}>
                <Descriptions
                  bordered
                  size="small"
                  column={1}
                  labelStyle={{ width: 140, background: "#fafafa" }}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                >
                  <Descriptions.Item label="Email">
                    <Space>
                      <MailOutlined /> {activeUser.email || "—"}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Username">
                    <Space>
                      <IdcardOutlined /> {activeUser.username}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Role/Position">
                    {activeUser.role}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag
                      color={getStatusColor(activeUser.status, activeUser.userType)}
                      style={{ borderRadius: 999 }}
                    >
                      {String(activeUser.status).charAt(0).toUpperCase() +
                        String(activeUser.status).slice(1)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Created">
                    {activeUser.createdAt
                      ? new Date(activeUser.createdAt).toLocaleString()
                      : "-"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Edit */}
              <Card style={{ ...glassCard, borderRadius: 16 }}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleUpdateUser}
                  disabled={mode === "view"}
                >
                  <Row gutter={[10, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="firstName"
                        label="First name"
                        rules={[{ required: true }]}
                      >
                        <Input prefix={<UserOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="lastName"
                        label="Last name"
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="middleInitial" label="Middle initial">
                        <Input maxLength={1} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="role" label="Role / Position">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="email" label="Email">
                        <Input type="email" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="status" label="Status">
                        <Select
                          options={[
                            { value: "approved", label: "Approved" },
                            { value: "pending", label: "Pending" },
                            { value: "rejected", label: "Rejected" },
                            { value: "anonymous", label: "Anonymous" },
                            { value: "regular", label: "Regular" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {mode === "edit" && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <Button onClick={() => setMode("view")}>Cancel</Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        style={{ background: BRAND.violet, borderColor: BRAND.violet }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </Form>
              </Card>
            </div>
          )}
        </Modal>
      </Content>

      {/* Styles */}
      <style>{`
        html, body, #root { height: 100%; }
        .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
        .ant-card:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(16,24,40,0.08); }
        .ant-table-thead > tr > th { background: #fff !important; }

        .ant-table .ant-table-tbody > tr:hover > td {
          background: ${BRAND.rowHover} !important;
        }
        .ant-table .ant-table-cell-fix-left {
          position: sticky;
          left: 0;
          z-index: 10 !important;
          background: #ffffff !important;
        }
        .ant-table .ant-table-cell-fix-left-last {
          box-shadow: 6px 0 6px -6px rgba(16,24,40,0.10);
        }
        .ant-table .ant-table-tbody > tr:hover > .ant-table-cell-fix-left,
        .ant-table .ant-table-tbody > tr.is-active > .ant-table-cell-fix-left {
          background: ${BRAND.rowHover} !important;
          z-index: 11 !important;
        }

        /* Side modal wrapper under sticky header */
        .floating-side { display:flex; justify-content:flex-end; align-items:center; padding:12px; }
        .floating-modal .ant-modal-content {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid ${BRAND.softBorder};
          background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.86));
          box-shadow: 0 24px 72px rgba(16,24,40,0.22);
        }
        .floating-modal .ant-modal-header {
          background: rgba(245,245,255,0.7);
          border-bottom: 1px solid ${BRAND.softBorder};
          border-radius: 18px 18px 0 0;
          padding: 10px 16px;
        }

        .modal-inner-animate { animation: slideIn .28s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes slideIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1); } }
      `}</style>
    </Layout>
  );
}
