import React from "react";
import { Result, Button, Typography } from "antd";

const { Title, Paragraph } = Typography;

const BRAND = {
    pink: "#e91e63",
    violet: "#7A5AF8",
    purple: "#6C3CF0",
};

const NotFoundPage = () => {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.violet})`,
                color: "#fff",
                textAlign: "center",
                padding: 20,
            }}
        >
            <Result
                status="404"
                title={<Title style={{ color: BRAND.purple, fontSize: 80 }}>404</Title>}
                subTitle={
                    <Paragraph style={{ color: "#fff", fontSize: 18 }}>
                        Oops! The page you are looking for does not exist. </Paragraph>
                }
                extra={
                    <Button
                        type="primary"
                        style={{ backgroundColor: BRAND.purple, borderColor: BRAND.purple }}
                        onClick={() => (window.location.href = "/")}
                    >
                        Go Home </Button>
                }
            /> </div>
    );
};

export default NotFoundPage;
