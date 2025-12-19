export default function HomePage() {
  const apiEndpoints = [
    {
      category: "Authentication",
      endpoints: [
        { method: "POST", path: "/api/auth/login", description: "User login" },
        { method: "POST", path: "/api/auth/register", description: "User registration" },
        { method: "POST", path: "/api/auth/logout", description: "User logout" },
        { method: "GET", path: "/api/auth/me", description: "Get current user" },
        { method: "PUT", path: "/api/auth/profile", description: "Update user profile" },
        { method: "POST", path: "/api/auth/refresh", description: "Refresh access token" },
        { method: "POST", path: "/api/auth/forgot-password", description: "Request password reset" },
        { method: "POST", path: "/api/auth/reset-password", description: "Reset password with token" },
      ],
    },
    {
      category: "Admin",
      endpoints: [
        { method: "POST", path: "/api/auth/admin/login", description: "Admin login" },
        { method: "GET", path: "/api/auth/admin/users", description: "Get all users (Admin only)" },
        { method: "GET", path: "/api/admin/stats", description: "Get admin statistics" },
      ],
    },
    {
      category: "Products & Orders",
      endpoints: [
        { method: "GET", path: "/api/products", description: "Get products list" },
        { method: "GET", path: "/api/orders", description: "Get orders list" },
        { method: "POST", path: "/api/returns/request", description: "Request product return" },
      ],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: "3rem", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "1rem",
            }}
          >
            Next.js Backend API
          </h1>
          <p style={{ fontSize: "1.2rem", color: "#a0a0a0" }}>
            RESTful API Server running on port 5000
          </p>
          <div
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#1a1a1a",
              borderRadius: "8px",
              display: "inline-block",
              border: "1px solid #333",
            }}
          >
            <code style={{ color: "#4ade80" }}>✓ Server Running</code>
          </div>
        </header>

        {/* API Documentation */}
        <div style={{ display: "grid", gap: "2rem" }}>
          {apiEndpoints.map((category, idx) => (
            <section
              key={idx}
              style={{
                background: "#1a1a1a",
                borderRadius: "12px",
                padding: "2rem",
                border: "1px solid #2a2a2a",
              }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  marginBottom: "1.5rem",
                  color: "#fff",
                  borderBottom: "2px solid #333",
                  paddingBottom: "0.5rem",
                }}
              >
                {category.category}
              </h2>
              <div style={{ display: "grid", gap: "1rem" }}>
                {category.endpoints.map((endpoint, epIdx) => (
                  <div
                    key={epIdx}
                    style={{
                      background: "#0f0f0f",
                      padding: "1rem",
                      borderRadius: "8px",
                      border: "1px solid #2a2a2a",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        background:
                          endpoint.method === "GET"
                            ? "#3b82f6"
                            : endpoint.method === "POST"
                            ? "#10b981"
                            : endpoint.method === "PUT"
                            ? "#f59e0b"
                            : "#ef4444",
                        color: "#fff",
                        minWidth: "60px",
                        textAlign: "center",
                      }}
                    >
                      {endpoint.method}
                    </span>
                    <code
                      style={{
                        color: "#60a5fa",
                        fontSize: "1rem",
                        flex: "1",
                        minWidth: "200px",
                      }}
                    >
                      {endpoint.path}
                    </code>
                    <span style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
                      {endpoint.description}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: "3rem",
            textAlign: "center",
            padding: "2rem",
            color: "#666",
            borderTop: "1px solid #2a2a2a",
          }}
        >
          <p>Built with Next.js 16.0.9 | TypeScript | Prisma</p>
        </footer>
      </div>
    </div>
  );
}
