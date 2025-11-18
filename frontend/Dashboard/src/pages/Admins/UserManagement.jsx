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
  ExclamationCircleOutlined,
  DeleteOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";

const { Header, Content } = Layout;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

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
  
  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
            phoneNumber: a.phoneNumber,
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
          phoneNumber: values.phoneNumber,
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
        message.success("User soft-deleted successfully");
        setDeleteModalOpen(false);
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

  const showDeleteConfirm = () => {
    setDeleteModalOpen(true);
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
        height: "100vh",
        width: "100%",
        background: BRAND.pageBg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sticky responsive header */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(250, 249, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BRAND.softBorder}`,
          boxShadow: "0 2px 12px rgba(16,24,40,0.06)",
          display: "flex",
          alignItems: "center",
          paddingInline: isXs ? 10 : isSm ? 12 : isMdUp ? 20 : 12,
          height: HEADER_H,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isXs ? 8 : 12, flex: 1 }}>
          {/* Sidebar toggle only on phones & small screens (dispatches existing toggle event Sidebar listens for) */}
          {!isMdUp && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: isXs ? 34 : 38,
                height: isXs ? 34 : 38,
                minWidth: isXs ? 34 : 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.9)",
                border: `1px solid ${BRAND.softBorder}`,
                boxShadow: "0 4px 12px rgba(122,90,248,0.08)",
                padding: 0,
                fontSize: 18,
              }}
            />
          )}

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            minWidth: 0,
            flex: 1,
          }}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              User Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Review, filter, and manage all users across roles and accounts.
              </Text>
            )}
          </div>
        </div>
      </Header>

      <Content
        ref={pageRef}
        style={{
          width: "100%",
          minWidth: 0,
          overflow: "auto",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        <div
          style={{
            padding: isXs ? 8 : isSm ? 10 : 12,
            width: "100%",
            maxWidth: "100%",
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: isXs ? 8 : 10,
            paddingInline: isXs ? 4 : isSm ? 8 : 12,
            transition: "width .25s ease",
            boxSizing: "border-box",
            minHeight: "100%",
          }}
        >
          {/* KPIs */}
          <Row gutter={[isXs ? 8 : 10, isXs ? 8 : 10]}>
            {[
              ["Total Users", userCounts.total, BRAND.violet],
              ["Administrators", userCounts.admins, BRAND.blue],
              ["Officials", userCounts.officials, BRAND.green],
              ["Victims", userCounts.victims, BRAND.pink],
            ].map(([label, value, color], i) => (
              <Col xs={12} sm={12} md={6} key={i}>
                <Card style={{ 
                  ...glassCard, 
                  padding: isXs ? "8px 10px" : "10px 12px",
                  textAlign: isXs ? "center" : "left",
                }}>
                  <Typography.Text 
                    type="secondary" 
                    style={{ 
                      fontSize: isXs ? 11 : 13,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {isXs && label.includes("Administrators") ? "Admins" : label}
                  </Typography.Text>
                  <Typography.Title
                    level={isXs ? 4 : 3}
                    style={{ 
                      margin: 0, 
                      color, 
                      fontSize: isXs ? 20 : isSm ? 22 : 24,
                      fontWeight: 700,
                    }}
                  >
                    {value}
                  </Typography.Title>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Toolbar - Sticky */}
          <Card 
            style={{ 
              ...glassCard, 
              padding: isXs ? "12px 8px" : isSm ? "12px 10px" : "14px 16px",
            
              top: 0,
              zIndex: 99,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              background: "rgba(250, 249, 255, 0.98)",
              boxShadow: "0 4px 20px rgba(16,24,40,0.12)",
              marginBottom: 2,
            }}
          >
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: isXs ? 10 : 12,
              width: "100%",
            }}>
              {/* Search Bar and Filters Row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isXs 
                  ? "1fr" 
                  : isSm 
                  ? "1fr 1fr" 
                  : isMdUp 
                  ? "minmax(240px, 320px) repeat(auto-fit, minmax(140px, 1fr))" 
                  : "1fr 1fr",
                gap: isXs ? 8 : 10,
                width: "100%",
                alignItems: "center",
              }}>
                <Search
                  placeholder={isXs ? "Search users..." : "Search name, email, username…"}
                  allowClear
                  enterButton={
                    <Button 
                      type="primary" 
                      icon={<SearchOutlined />}
                      style={{
                        background: BRAND.violet,
                        borderColor: BRAND.violet,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {!isXs && "Search"}
                    </Button>
                  }
                  size={isXs ? "middle" : "large"}
                  style={{ width: "100%" }}
                  value={searchText}
                  onSearch={setSearchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />

                <Select
                  value={filterType}
                  onChange={setFilterType}
                  size={isXs ? "middle" : "large"}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "admin", label: isXs ? "Admins" : "Administrators" },
                    { value: "official", label: "Officials" },
                    { value: "victim", label: "Victims" },
                  ]}
                />
                <Select
                  value={filterStatus}
                  onChange={setFilterStatus}
                  size={isXs ? "middle" : "large"}
                  style={{ width: "100%" }}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "approved", label: "Approved" },
                    { value: "pending", label: "Pending" },
                    { value: "rejected", label: "Rejected" },
                    { value: "anonymous", label: isXs ? "Anon" : "Anonymous" },
                    { value: "regular", label: "Regular" },
                  ]}
                />
                <RangePicker
                  onChange={setDateRange}
                  allowEmpty={[true, true]}
                  placeholder={["Start", "End"]}
                  suffixIcon={<CalendarOutlined />}
                  size={isXs ? "middle" : "large"}
                  style={{ 
                    width: "100%",
                    gridColumn: isXs ? "span 1" : "auto",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: 8,
                justifyContent: isXs ? "stretch" : "flex-end",
                width: "100%",
              }}>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchAllUsers} 
                  size={isXs ? "middle" : "large"}
                  style={{ 
                    flex: isXs ? 1 : "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {!isXs && "Refresh"}
                </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={exportCsv} 
                  size={isXs ? "middle" : "large"}
                  type="primary"
                  style={{ 
                    flex: isXs ? 1 : "0 0 auto",
                    background: BRAND.violet,
                    borderColor: BRAND.violet,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
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
          centered={true}
          width={modalWidth}
          wrapClassName="floating-side"
          className="floating-modal"
          maskStyle={{
            backdropFilter: "blur(2px)",
            background: "rgba(17,17,26,0.24)",
          }}
          destroyOnClose
          styles={{ 
            body: { 
              padding: 12,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              overflowX: 'hidden'
            } 
          }}
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
                  <Button danger onClick={showDeleteConfirm}>Delete</Button>
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
                  <Descriptions.Item label="Phone Number">
                    <Space>
                      <PhoneOutlined /> {activeUser.phoneNumber || "—"}
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
                    <Col xs={24}>
                      <Form.Item name="phoneNumber" label="Phone Number">
                        <Input placeholder="+63 (234) 567-8900" />
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

        {/* Delete Confirmation Modal */}
        <Modal
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <span>Confirm Delete</span>
            </Space>
          }
          open={deleteModalOpen}
          onCancel={() => setDeleteModalOpen(false)}
          onOk={handleDeleteUser}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, loading }}
          centered
        >
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>
              Are you sure you want to delete this user?
            </p>
            {activeUser && (
              <div style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 8,
                marginTop: 12 
              }}>
                <Space direction="vertical" size={4}>
                  <Text strong>{activeUser.name}</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    @{activeUser.username} • {activeUser.email}
                  </Text>
                  <Tag style={{ marginTop: 4 }}>{activeUser.userType}</Tag>
                </Space>
              </div>
            )}
            <p style={{ marginTop: 16, marginBottom: 0, color: '#666', fontSize: 13 }}>
              This action will soft-delete the user.
            </p>
          </div>
        </Modal>
      </Content>

      {/* Styles */}
      <style>{`
        /* Remove button outlines */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        button:focus,
        button:active {
          outline: none !important;
          box-shadow: none !important;
        }

        html, body, #root { height: 100%; }
        .ant-card { transition: transform .18s ease, box-shadow .18s ease; }
        .ant-card:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(16,24,40,0.08); }
        .ant-table-thead > tr > th { background: #fff !important; }

        /* Smooth sticky transitions */
        .ant-layout-header {
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }

        /* Better mobile input sizing */
        @media (max-width: 576px) {
          .ant-input-search .ant-input-group .ant-input {
            font-size: 14px !important;
          }
          .ant-select-selector {
            font-size: 14px !important;
          }
          .ant-picker {
            font-size: 14px !important;
          }
          .ant-btn {
            font-size: 14px !important;
          }
        }

        /* Improve mobile date picker */
        @media (max-width: 576px) {
          .ant-picker-dropdown {
            width: 100vw !important;
            max-width: 320px !important;
          }
        }

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
        .floating-side { 
          display: flex !important; 
          justify-content: center !important; 
          align-items: center !important; 
          padding: 20px !important; 
          overflow: hidden !important;
        }
        .floating-modal .ant-modal {
          top: 0 !important;
          padding-bottom: 0 !important;
        }
        .floating-modal .ant-modal-content {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid ${BRAND.softBorder};
          background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.86));
          box-shadow: 0 24px 72px rgba(16,24,40,0.22);
          max-height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
        }
        .floating-modal .ant-modal-header {
          background: rgba(245,245,255,0.7);
          border-bottom: 1px solid ${BRAND.softBorder};
          border-radius: 18px 18px 0 0;
          padding: 10px 16px;
          flex-shrink: 0;
        }
        .floating-modal .ant-modal-body {
          flex: 1;
          min-height: 0;
        }
        
        /* Mobile modal optimizations */
        @media (max-width: 767px) {
          .floating-side {
            padding: 0 !important;
            align-items: center !important;
            overflow: hidden !important;
          }
          .floating-modal .ant-modal {
            max-height: 100vh !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            top: 0 !important;
          }
          .floating-modal .ant-modal-content {
            max-height: 100vh !important;
            height: 100vh !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .floating-modal .ant-modal-header {
            padding: 8px 12px;
          }
          .floating-modal .ant-modal-body {
            padding: 8px !important;
            max-height: calc(100vh - 120px) !important;
          }
          .floating-modal .ant-modal-close {
            top: 8px;
            right: 8px;
          }
        }
        
        @media (min-width: 768px) and (max-width: 991px) {
          .floating-side {
            padding: 4px !important;
          }
          .floating-modal .ant-modal-content {
            max-height: calc(100vh - 16px);
          }
          .floating-modal .ant-modal-body {
            max-height: calc(100vh - 140px) !important;
          }
        }
        
        /* Custom scrollbar for modal body */
        .floating-modal .ant-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .floating-modal .ant-modal-body::-webkit-scrollbar-track {
          background: rgba(122, 90, 248, 0.08);
          border-radius: 10px;
        }
        .floating-modal .ant-modal-body::-webkit-scrollbar-thumb {
          background: rgba(122, 90, 248, 0.3);
          border-radius: 10px;
        }
        .floating-modal .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(122, 90, 248, 0.5);
        }

        .modal-inner-animate { animation: slideIn .28s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes slideIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1); } }
      `}</style>
    </Layout>
  );
}
