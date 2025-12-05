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
  TeamOutlined,
  SafetyOutlined,
  CrownOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import { api } from "../../lib/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

  // Quick Update Box state
  const [quickUpdateModalOpen, setQuickUpdateModalOpen] = useState(false);
  const [quickUpdateRole, setQuickUpdateRole] = useState(""); // "Barangay Captain" or "VAWC Chairman"
  const [quickUpdateForm] = Form.useForm();

  // -------- Validation helper --------
  const validateNameField = (fieldName, value) => {
    if (!value || value.trim() === "") return null;
    
    const strValue = String(value).trim();
    
    // Check for 3+ repeated characters (e.g., "aaa", "bbb")
    if (/(.)\1{2}/.test(strValue)) {
      return `${fieldName} cannot contain repeated characters`;
    }
    
    return null;
  };

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
            name: `${a.firstName} ${
              a.middleInitial ? a.middleInitial + " " : ""
            }${a.lastName}`,
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
            name: `${v.firstName} ${
              v.middleInitial ? v.middleInitial + " " : ""
            }${v.lastName}`,
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
            name: `${o.firstName} ${
              o.middleInitial ? o.middleInitial + " " : ""
            }${o.lastName}`,
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
      lastName:
        record.lastName || record.name.split(" ").slice(1).join(" ") || "",
      email: record.email === "N/A" ? "" : record.email,
      role: record.role,
      status: record.status,
      phoneNumber: record.phoneNumber || "",
    });
    setModalOpen(true);
  };

  // Helpers
  const getStatusColor = (status, userType) => {
    if (userType === "victim")
      return status === "anonymous" ? "orange" : "blue";
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
        if (
          values.role !== "anonymous" &&
          values.email &&
          values.email.trim() !== ""
        )
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
      const res = await api.put(
        `/api/admin/${path}/soft-delete/${activeUser.id}`
      );
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
    if (filterType !== "all")
      filtered = filtered.filter((u) => u.userType === filterType);
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
    // Sorting (oldest accounts first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
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
            <Avatar
              style={{
                background: typePillBg(record.userType),
                color: "#444",
              }}
            >
              {record.avatar}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700 }}>{text}</div>
              <div style={{ fontSize: 12, color: "#999" }}>
                @{record.username}
              </div>
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
          <Tag
            color={getStatusColor(s, r.userType)}
            style={{ borderRadius: 999 }}
          >
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
    () => {
      const activeUsers = allUsers.filter((u) => !u.isDeleted);
      return {
        total: activeUsers.length,
        admins: activeUsers.filter((u) => u.userType === "admin").length,
        officials: activeUsers.filter((u) => u.userType === "official").length,
        victims: activeUsers.filter((u) => u.userType === "victim").length,
      };
    },
    [allUsers]
  );

  // Get current role holders
  const getCurrentRoleHolder = (role) => {
    return allUsers.find(
      (u) => u.userType === "official" && u.role === role && !u.isDeleted
    );
  };

  // Quick Update Handler
  const handleQuickUpdate = async (values) => {
    try {
      const newOfficialId = values.newOfficial;
      const newOfficial = allUsers.find((u) => u.id === newOfficialId);
      
      if (!newOfficial) {
        message.error("Selected official not found");
        return;
      }

      // Update the official's position
      const payload = {
        firstName: newOfficial.firstName,
        middleInitial: newOfficial.middleInitial,
        lastName: newOfficial.lastName,
        officialEmail: newOfficial.email,
        phoneNumber: newOfficial.phoneNumber,
        position: quickUpdateRole,
        status: newOfficial.status,
      };

      const response = await api.put(
        `/api/admin/officials/${newOfficial.id}`,
        payload
      );

      if (response.data.success) {
        message.success(`${quickUpdateRole} updated successfully!`);
        setQuickUpdateModalOpen(false);
        quickUpdateForm.resetFields();
        fetchAllUsers();
      }
    } catch (err) {
      console.error("Error updating role:", err);
      message.error(err.response?.data?.message || "Failed to update role");
    }
  };

  const openQuickUpdate = (role) => {
    setQuickUpdateRole(role);
    quickUpdateForm.resetFields();
    setQuickUpdateModalOpen(true);
  };

  // Export to Excel
  const exportCsv = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    let currentRow = 1;

    // Add title
    const titleRow = worksheet.addRow(["USER EXPORT SUMMARY"]);
    titleRow.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A5AF8" }
    };
    titleRow.alignment = { horizontal: "left", vertical: "center", wrapText: true };
    titleRow.height = 35;
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    currentRow++;

    // Add timestamp
    const metaRow = worksheet.addRow([`Generated: ${new Date().toLocaleString()}`, "", "", "", "", "", ""]);
    metaRow.font = { size: 11 };
    metaRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    metaRow.height = 30;
    currentRow++;

    // Add spacer
    worksheet.addRow([""]);
    currentRow++;

    // Calculate user type breakdown
    const userTypeBreakdown = {};
    filteredUsers.forEach(u => {
      const type = u.userType || "Unknown";
      userTypeBreakdown[type] = (userTypeBreakdown[type] || 0) + 1;
    });

    // Add total users with type breakdown on separate lines in the same cell
    const sortedUserTypes = Object.entries(userTypeBreakdown).sort(([a], [b]) => a.localeCompare(b));
    const typeBreakdownStr = sortedUserTypes.map(([type, count]) => `${type.toLowerCase()}: ${count}`).join("\n");
    
    const totalRow = worksheet.addRow([`Total Users: ${filteredUsers.length}`, typeBreakdownStr]);
    totalRow.font = { size: 11, bold: true };
    totalRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    totalRow.height = Math.max(sortedUserTypes.length * 18, 24);
    totalRow.getCell(1).font = { bold: true, size: 11 };
    totalRow.getCell(2).font = { size: 11 };
    totalRow.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    // Don't merge - keep breakdown in column B only
    currentRow++;

    // Add spacer
    worksheet.addRow([""]);
    currentRow++;

    // Define headers
    const headers = ["Name", "Username", "Email", "Type", "Role", "Status", "Created At"];

    // Add header row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A5AF8" }
    };
    headerRow.alignment = { horizontal: "center", vertical: "center", wrapText: true };
    headerRow.height = 50;
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "medium", color: { argb: "FF000000" } },
        left: { style: "medium", color: { argb: "FF000000" } },
        bottom: { style: "medium", color: { argb: "FF000000" } },
        right: { style: "medium", color: { argb: "FF000000" } }
      };
    });
    currentRow++;

    // Sort users by type (alphabetically)
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      const aType = (a.userType || "Unknown").toLowerCase();
      const bType = (b.userType || "Unknown").toLowerCase();
      return aType.localeCompare(bType);
    });

    // Add data rows
    sortedUsers.forEach((u) => {
      const rowData = [
        u.name || "",
        u.username || "",
        u.email || "",
        u.userType || "",
        u.role || "",
        u.status || "",
        u.createdAt ? new Date(u.createdAt).toLocaleString() : ""
      ];

      const row = worksheet.addRow(rowData);
      row.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      row.height = "auto";
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } }
        };
      });
    });

    // Set column widths
    const columnWidths = [25, 20, 30, 18, 15, 15, 25];
    worksheet.columns = columnWidths.map(width => ({ width }));

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Users_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const modalWidth = isXs
    ? "100%"
    : screens.xl
    ? 700
    : screens.lg
    ? 660
    : screens.md
    ? "92vw"
    : "96vw";

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isXs ? 8 : 12,
            flex: 1,
          }}
        >
          {/* Sidebar toggle only on phones & small screens */}
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              flex: 1,
            }}
          >
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

        <div style={{ display: "flex", gap: isXs ? 6 : 8, flexShrink: 0 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAllUsers}
            size={isXs ? "middle" : "middle"}
            style={{ 
              borderColor: BRAND.violet, 
              color: BRAND.violet,
              borderRadius: isXs ? 8 : 10,
              height: isXs ? 32 : 36,
              fontSize: isXs ? 13 : 14,
              padding: isXs ? "0 8px" : "4px 15px",
              fontWeight: 600
            }}
          >
            {isMdUp ? "Refresh" : null}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportCsv}
            type="primary"
            size={isXs ? "middle" : "middle"}
            style={{ 
              background: BRAND.violet, 
              borderColor: BRAND.violet,
              borderRadius: isXs ? 8 : 10,
              height: isXs ? 32 : 36,
              fontSize: isXs ? 13 : 14,
              padding: isXs ? "0 8px" : "4px 15px",
              fontWeight: 600
            }}
          >
            {isMdUp ? "Export" : null}
          </Button>
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
          {/* Quick Insights Card */}
          <Card
            bordered
            style={{
              marginBottom: isXs ? 12 : 16,
              borderRadius: isXs ? 12 : 18,
              borderColor: BRAND.softBorder,
              boxShadow: "0 20px 46px rgba(122,90,248,0.06)",
              background: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(250,247,255,0.88))",
              position: "relative",
              overflow: "hidden",
            }}
            bodyStyle={{ padding: isXs ? 12 : 20 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={2}>
                <Typography.Title level={5} style={{ margin: 0, color: BRAND.violet }}>
                  <TeamOutlined style={{ marginRight: 8 }} />
                  Quick Insights
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Key metrics and analytics overview
                </Typography.Text>
              </Space>
            </div>

            <Row gutter={[isXs ? 8 : 16, isXs ? 8 : 16]}>
              <Col xs={24} sm={24} md={24} lg={24} xl={24} style={{ display: 'flex', gap: isXs ? 8 : 16, flexWrap: isXs ? 'wrap' : 'nowrap', justifyContent: 'space-between' }}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${BRAND.softBorder}`,
                    background: "linear-gradient(135deg, #f6f3ff, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110,
                  }}
                  bodyStyle={{
                    padding: isXs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ padding: isXs ? "4px 0" : "8px 0" }}>
                    <TeamOutlined
                      style={{
                        fontSize: isXs ? 20 : 24,
                        color: BRAND.violet,
                        marginBottom: 4,
                      }}
                    />
                    <div
                      style={{
                        fontSize: isXs ? 11 : 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      Total Users
                    </div>
                    <div
                      style={{
                        fontSize: isXs ? 20 : 24,
                        fontWeight: 700,
                        color: BRAND.violet,
                      }}
                    >
                      {userCounts.total}
                    </div>
                  </div>
                </Card>

                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(24,144,255,0.2)",
                    background: "linear-gradient(135deg, #e6f7ff, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110,
                  }}
                  bodyStyle={{
                    padding: isXs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ padding: isXs ? "4px 0" : "8px 0" }}>
                    <SafetyOutlined
                      style={{
                        fontSize: isXs ? 20 : 24,
                        color: BRAND.blue,
                        marginBottom: 4,
                      }}
                    />
                    <div
                      style={{
                        fontSize: isXs ? 11 : 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      {isXs ? "Admins" : "Administrators"}
                    </div>
                    <div
                      style={{
                        fontSize: isXs ? 20 : 24,
                        fontWeight: 700,
                        color: BRAND.blue,
                      }}
                    >
                      {userCounts.admins}
                    </div>
                  </div>
                </Card>

                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(82,196,26,0.2)",
                    background: "linear-gradient(135deg, #f6ffed, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110,
                  }}
                  bodyStyle={{
                    padding: isXs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ padding: isXs ? "4px 0" : "8px 0" }}>
                    <CrownOutlined
                      style={{
                        fontSize: isXs ? 20 : 24,
                        color: BRAND.green,
                        marginBottom: 4,
                      }}
                    />
                    <div
                      style={{
                        fontSize: isXs ? 11 : 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      Officials
                    </div>
                    <div
                      style={{
                        fontSize: isXs ? 20 : 24,
                        fontWeight: 700,
                        color: BRAND.green,
                      }}
                    >
                      {userCounts.officials}
                    </div>
                  </div>
                </Card>

                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(233,30,99,0.2)",
                    background: "linear-gradient(135deg, #fff0f7, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110,
                  }}
                  bodyStyle={{
                    padding: isXs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ padding: isXs ? "4px 0" : "8px 0" }}>
                    <HeartOutlined
                      style={{
                        fontSize: isXs ? 20 : 24,
                        color: BRAND.pink,
                        marginBottom: 4,
                      }}
                    />
                    <div
                      style={{
                        fontSize: isXs ? 11 : 12,
                        color: "#666",
                        marginBottom: 4,
                      }}
                    >
                      Victims
                    </div>
                    <div
                      style={{
                        fontSize: isXs ? 20 : 24,
                        fontWeight: 700,
                        color: BRAND.pink,
                      }}
                    >
                      {userCounts.victims}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Quick Role Update */}
          <Card
            style={{
              ...glassCard,
              padding: isXs ? "16px 14px" : "20px 24px",
              background: "linear-gradient(135deg, rgba(122,90,248,0.06) 0%, rgba(122,90,248,0.02) 100%)",
              border: `1.5px solid ${BRAND.softBorder}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative background elements */}
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                background: `radial-gradient(circle, ${BRAND.violet}15, transparent 70%)`,
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -30,
                left: -30,
                width: 100,
                height: 100,
                background: `radial-gradient(circle, ${BRAND.green}12, transparent 70%)`,
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: isXs ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isXs ? "flex-start" : "center",
                gap: isXs ? 14 : 20,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 4,
                      height: 24,
                      background: `linear-gradient(180deg, ${BRAND.violet}, ${BRAND.pink})`,
                      borderRadius: 999,
                    }}
                  />
                  <Typography.Title
                    level={5}
                    style={{
                      margin: 0,
                      color: BRAND.violet,
                      fontWeight: 700,
                      fontSize: isXs ? 15 : 16,
                    }}
                  >
                    Quick Role Update
                  </Typography.Title>
                </div>
                <Typography.Text
                  type="secondary"
                  style={{
                    fontSize: isXs ? 12 : 13,
                    display: "block",
                    marginLeft: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Quickly reassign Barangay Captain or VAWC Chairman positions
                </Typography.Text>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: isXs ? 8 : 12,
                  width: isXs ? "100%" : "auto",
                  flexWrap: isXs ? "nowrap" : "wrap",
                }}
              >
                <Button
                  type="primary"
                  size={isXs ? "middle" : "large"}
                  onClick={() => openQuickUpdate("Barangay Captain")}
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.violet} 0%, #9b7dff 100%)`,
                    borderColor: "transparent",
                    height: isXs ? 36 : 44,
                    fontWeight: 600,
                    fontSize: isXs ? 12 : 14,
                    boxShadow: `0 4px 12px ${BRAND.violet}30`,
                    width: isXs ? "50%" : "auto",
                    minWidth: isXs ? 0 : 140,
                    borderRadius: isXs ? 8 : 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: isXs ? 4 : 6,
                    padding: isXs ? "0 8px" : "4px 15px",
                  }}
                  icon={
                    <EditOutlined
                      style={{
                        fontSize: isXs ? 13 : 15,
                      }}
                    />
                  }
                >
                  {isXs ? "Captain" : "Update Captain"}
                </Button>
                <Button
                  type="primary"
                  size={isXs ? "middle" : "large"}
                  onClick={() => openQuickUpdate("VAWC Chairman")}
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.green} 0%, #73d13d 100%)`,
                    borderColor: "transparent",
                    height: isXs ? 36 : 44,
                    fontWeight: 600,
                    fontSize: isXs ? 12 : 14,
                    boxShadow: `0 4px 12px ${BRAND.green}30`,
                    width: isXs ? "50%" : "auto",
                    minWidth: isXs ? 0 : 140,
                    borderRadius: isXs ? 8 : 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: isXs ? 4 : 6,
                    padding: isXs ? "0 8px" : "4px 15px",
                  }}
                  icon={
                    <EditOutlined
                      style={{
                        fontSize: isXs ? 13 : 15,
                      }}
                    />
                  }
                >
                  {isXs ? "Chairman" : "Update Chairman"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Toolbar - Sticky card */}
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: isXs ? 10 : 12,
                width: "100%",
              }}
            >
              {/* Search Bar and Filters Row */}
              <div
                style={{
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
                }}
              >
                <Search
                  placeholder={
                    isXs
                      ? "Search users..."
                      : "Search name, email, username…"
                  }
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
                    {
                      value: "admin",
                      label: isXs ? "Admins" : "Administrators",
                    },
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

        {/* USER DETAIL / EDIT MODAL */}
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          centered={!isXs}
          width={modalWidth}
          wrapClassName="floating-side"
          className="floating-modal"
          maskStyle={{
            backdropFilter: "blur(2px)",
            background: "rgba(17,17,26,0.24)",
          }}
          destroyOnClose
          style={isXs ? { top: 8, paddingBottom: 0 } : {}}
          // ensure base layer below delete modal
          zIndex={1000}
          title={
            activeUser ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: isXs ? "column" : "row",
                  alignItems: isXs ? "flex-start" : "center",
                  justifyContent: isXs ? "flex-start" : "space-between",
                  gap: isXs ? 8 : 12,
                }}
              >
                <Space
                  align="start"
                  size={8}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Avatar
                    style={{
                      background: typePillBg(activeUser.userType),
                      color: "#444",
                    }}
                  >
                    {activeUser.avatar}
                  </Avatar>
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: isXs ? 15 : 16,
                        lineHeight: 1.2,
                      }}
                    >
                      {activeUser.name}{" "}
                      <Tag style={{ marginLeft: 6 }}>
                        {activeUser.userType}
                      </Tag>
                    </div>
                    <Typography.Text type="secondary">
                      @{activeUser.username}
                    </Typography.Text>
                  </div>
                </Space>
                <Space
                  size={8}
                  style={{
                    marginTop: isXs ? 4 : 0,
                    width: isXs ? "100%" : "auto",
                    justifyContent: isXs ? "flex-end" : "flex-start",
                    flexWrap: isXs ? "wrap" : "nowrap",
                    rowGap: 6,
                  }}
                >
                  {mode === "view" ? (
                    <Button
                      type="primary"
                      size={isXs ? "small" : "middle"}
                      onClick={() => setMode("edit")}
                      icon={<EditOutlined />}
                      style={{
                        background: BRAND.violet,
                        borderColor: BRAND.violet,
                      }}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      size={isXs ? "small" : "middle"}
                      onClick={() => {
                        // Reset form to original activeUser values
                        if (activeUser) {
                          form.setFieldsValue({
                            firstName: activeUser.firstName || "",
                            lastName: activeUser.lastName || "",
                            middleInitial: activeUser.middleInitial || "",
                            role: activeUser.role || "",
                            email: activeUser.email || "",
                            phoneNumber: activeUser.phoneNumber || "",
                          });
                        }
                        setMode("view");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    danger
                    size={isXs ? "small" : "middle"}
                    onClick={showDeleteConfirm}
                    icon={<DeleteOutlined />}
                  >
                    Delete
                  </Button>
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
              <Card
                style={{ ...glassCard, borderRadius: 16, marginBottom: 12 }}
              >
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
                      color={getStatusColor(
                        activeUser.status,
                        activeUser.userType
                      )}
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
                  validateTrigger={['onChange', 'onBlur']}
                >
                  <Row gutter={[10, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="firstName"
                        label="First name"
                        rules={[
                          { required: true, message: "First name is required" },
                          {
                            validator: (_, value) => {
                              const error = validateNameField("First name", value);
                              return error ? Promise.reject(new Error(error)) : Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Input 
                          prefix={<UserOutlined />}
                          onChange={() => form.validateFields(['firstName'])}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="lastName"
                        label="Last name"
                        rules={[
                          { required: true, message: "Last name is required" },
                          {
                            validator: (_, value) => {
                              const error = validateNameField("Last name", value);
                              return error ? Promise.reject(new Error(error)) : Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Input 
                          onChange={() => form.validateFields(['lastName'])}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="middleInitial" label="Middle initial">
                        <Input maxLength={1} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="role" label="Role / Position">
                        {activeUser?.userType === "official" ? (
                          <Select placeholder="Select position">
                            <Select.Option value="Barangay Captain">Barangay Captain</Select.Option>
                            <Select.Option value="Kagawad">Kagawad</Select.Option>
                            <Select.Option value="Secretary">Secretary</Select.Option>
                            <Select.Option value="Treasurer">Treasurer</Select.Option>
                            <Select.Option value="SK Chairman">SK Chairman</Select.Option>
                            <Select.Option value="Chief Tanod">Chief Tanod</Select.Option>
                          </Select>
                        ) : activeUser?.userType === "admin" ? (
                          <Select placeholder="Select role">
                            <Select.Option value="Super Admin">Super Admin</Select.Option>
                            <Select.Option value="Admin">Admin</Select.Option>
                          </Select>
                        ) : (
                          <Input disabled />
                        )}
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="email" label="Email">
                        <Input type="email" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item 
                        name="phoneNumber" 
                        label="Phone Number"
                        rules={[
                          {
                            validator: (_, value) => {
                              if (!value) return Promise.resolve();
                              const phPattern = /^(\+63|0)[0-9]{10}$/;
                              return phPattern.test(value.replace(/[\s()-]/g, ''))
                                ? Promise.resolve()
                                : Promise.reject(new Error("Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)"));
                            },
                          },
                        ]}
                      >
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
                    <div className="edit-footer-bar">
                      <Button 
                        onClick={() => {
                          // Reset form to original activeUser values
                          if (activeUser) {
                            form.setFieldsValue({
                              firstName: activeUser.firstName || "",
                              lastName: activeUser.lastName || "",
                              middleInitial: activeUser.middleInitial || "",
                              role: activeUser.role || "",
                              email: activeUser.email || "",
                              phoneNumber: activeUser.phoneNumber || "",
                            });
                          }
                          setMode("view");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        style={{
                          background: BRAND.violet,
                          borderColor: BRAND.violet,
                        }}
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
              <ExclamationCircleOutlined
                style={{ color: "#ff4d4f", fontSize: 20 }}
              />
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
          // always above the user detail modal
          zIndex={1200}
        >
          <div style={{ padding: "12px 0" }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>
              Are you sure you want to delete this user?
            </p>
            {activeUser && (
              <div
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 12,
                }}
              >
                <Space direction="vertical" size={4}>
                  <Text strong>{activeUser.name}</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    @{activeUser.username} • {activeUser.email}
                  </Text>
                  <Tag style={{ marginTop: 4 }}>{activeUser.userType}</Tag>
                </Space>
              </div>
            )}
            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                color: "#666",
                fontSize: 13,
              }}
            >
              This action will soft-delete the user.
            </p>
          </div>
        </Modal>

        {/* QUICK UPDATE MODAL */}
        <Modal
          open={quickUpdateModalOpen}
          onCancel={() => {
            setQuickUpdateModalOpen(false);
            quickUpdateForm.resetFields();
          }}
          title={
            <Space>
              <EditOutlined style={{ color: BRAND.violet }} />
              <span>Update {quickUpdateRole}</span>
            </Space>
          }
          footer={null}
          centered
          width={500}
          zIndex={1002}
        >
          <Form
            form={quickUpdateForm}
            onFinish={handleQuickUpdate}
            layout="vertical"
            style={{ marginTop: 16 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong>Current {quickUpdateRole}:</Typography.Text>
              <div style={{ marginTop: 8, padding: 12, background: "#f5f5f5", borderRadius: 8 }}>
                {(() => {
                  const current = getCurrentRoleHolder(quickUpdateRole);
                  return current ? (
                    <Space>
                      <Avatar style={{ background: typePillBg("official"), color: "#444" }}>
                        {current.avatar}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 600 }}>{current.name}</div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          @{current.username}
                        </Typography.Text>
                      </div>
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">No official currently assigned</Typography.Text>
                  );
                })()}
              </div>
            </div>

            <Form.Item
              name="newOfficial"
              label={`Select New ${quickUpdateRole}`}
              rules={[{ required: true, message: "Please select an official" }]}
            >
              <Select
                placeholder="Choose an official"
                showSearch
                optionFilterProp="children"
                size="large"
                filterOption={(input, option) =>
                  option.children.props.children[1].props.children[0].toLowerCase().includes(input.toLowerCase())
                }
              >
                {allUsers
                  .filter(
                    (u) =>
                      u.userType === "official" &&
                      !u.isDeleted &&
                      u.status === "approved"
                  )
                  .map((official) => (
                    <Select.Option key={official.id} value={official.id}>
                      <Space>
                        <Avatar size="small" style={{ background: typePillBg("official"), color: "#444" }}>
                          {official.avatar}
                        </Avatar>
                        <span>
                          {official.name}
                          {official.role && official.role !== quickUpdateRole && (
                            <Tag style={{ marginLeft: 8 }} color="blue">
                              {official.role}
                            </Tag>
                          )}
                        </span>
                      </Space>
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button
                  onClick={() => {
                    setQuickUpdateModalOpen(false);
                    quickUpdateForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    background: BRAND.violet,
                    borderColor: BRAND.violet,
                  }}
                >
                  Update Role
                </Button>
              </Space>
            </Form.Item>
          </Form>
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

        .ant-layout-header {
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }

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
        }

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

        /* Side modal wrapper – centered */
        .floating-side { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          padding: 12px; 
        }

        .floating-modal .ant-modal-content {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid ${BRAND.softBorder};
          background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.86));
          box-shadow: 0 24px 72px rgba(16,24,40,0.22);
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 40px);
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
          overflow-y: auto;
          padding: 10px 12px 30px;
          box-sizing: border-box;
          max-height: calc(100vh - ${HEADER_H}px - 80px);
        }

        @media (max-width: 576px) {
          .floating-side { 
            padding: 0; 
            align-items: center; 
          }
          .floating-side .ant-modal {
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .floating-modal .ant-modal-content {
            border-radius: 16px;
            max-height: calc(100vh - 16px);
          }
          .floating-modal .ant-modal-body {
            padding: 8px 10px 80px;
          }
        }

        /* Edit footer buttons – always inside card */
        .edit-footer-bar {
          margin-top: 16px;
          padding: 12px 8px 4px;
          box-sizing: border-box;
          border-top: 1px dashed rgba(148, 163, 184, 0.6);
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 480px) {
          .edit-footer-bar {
            flex-direction: column-reverse;
            align-items: stretch;
            padding: 12px 10px 4px;
          }
          .edit-footer-bar .ant-btn {
            width: 100%;
          }
        }

        .modal-inner-animate { 
          animation: slideIn .28s cubic-bezier(.2,.7,.3,1) both; 
        }
        @keyframes slideIn {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Custom Scrollbar - Optimized for Performance */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(241, 238, 255, 0.3);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(167, 139, 250, 0.6);
          border-radius: 10px;
          will-change: background;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }

        /* Firefox scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(167, 139, 250, 0.6) rgba(241, 238, 255, 0.3);
        }
      `}</style>
    </Layout>
  );
}
