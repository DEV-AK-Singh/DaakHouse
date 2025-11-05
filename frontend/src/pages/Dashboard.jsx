import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { emailService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

function Dashboard() {
  const [recentEmails, setRecentEmails] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    withAttachments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Show success message if redirected from compose
  useEffect(() => {
    if (location.state?.message) {
      alert(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch recent emails
      const emailsResponse = await emailService.getEmails(1, 3);
      const emails = emailsResponse.data.value || [];
      setRecentEmails(emails);

      // Calculate stats
      const unreadCount = emails.filter((email) => !email.isRead).length;
      const attachmentCount = emails.filter(email => email.hasAttachments).length;
  
      setStats({
        total: emails.length,
        unread: unreadCount,
        withAttachments: attachmentCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      const response = await emailService.testPermissions();
      console.log("Connection test successful:", response.data);
      alert("✅ Connection successful! You can send and receive emails.");
    } catch (error) {
      console.error("Connection test failed:", error);
      alert(
        "❌ Connection failed: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (emailId, isRead) => {
    try {
      await emailService.updateEmail(emailId, { isRead: !isRead });

      // Update local state
      setRecentEmails((prev) =>
        prev.map((email) =>
          email.id === emailId ? { ...email, isRead: !isRead } : email
        )
      );

      // Update stats
      setStats((prev) => ({
        ...prev,
        unread: isRead ? prev.unread + 1 : prev.unread - 1,
      }));
    } catch (error) {
      console.error("Error updating email:", error);
      alert("Failed to update email status");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch (error) {
      return dateString;
    }
  };

  const formatPreview = (preview) => {
    if (!preview) return "No preview available";
    return preview.length > 100 ? preview.substring(0, 100) + "..." : preview;
  };

  const getSenderName = (from) => {
    if (!from) return "Unknown Sender";

    const emailAddress = from.emailAddress || from;
    if (typeof emailAddress === "string") {
      return emailAddress;
    }
    return emailAddress.name || emailAddress.address || "Unknown Sender";
  };

  console.log(recentEmails);

  if (loading && recentEmails.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? "Testing..." : "Test Connection"}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                to="/compose"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Compose Email
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={fetchDashboardData}
                className="text-red-600 hover:text-red-800 underline text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="shrink-0 bg-blue-100 rounded-md p-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Emails
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="shrink-0 bg-green-100 rounded-md p-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Unread Emails
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.unread}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="shrink-0 bg-purple-100 rounded-md p-3">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      With Attachments
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.withAttachments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/compose"
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center">
                <svg
                  className="w-8 h-8 text-blue-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <div>
                  <h3 className="font-medium text-gray-900">Compose</h3>
                  <p className="text-sm text-gray-500">Write new email</p>
                </div>
              </div>
            </Link>

            <Link
              to="/emails"
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-green-500 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center">
                <svg
                  className="w-8 h-8 text-green-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <h3 className="font-medium text-gray-900">Inbox</h3>
                  <p className="text-sm text-gray-500">View all emails</p>
                </div>
              </div>
            </Link>

            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all duration-200 text-left disabled:opacity-50"
            >
              <div className="flex items-center">
                <svg
                  className="w-8 h-8 text-orange-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <div>
                  <h3 className="font-medium text-gray-900">Test Connection</h3>
                  <p className="text-sm text-gray-500">Check email service</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all duration-200 text-left disabled:opacity-50"
            >
              <div className="flex items-center">
                <svg
                  className="w-8 h-8 text-purple-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <div>
                  <h3 className="font-medium text-gray-900">Refresh</h3>
                  <p className="text-sm text-gray-500">Update emails</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Emails */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Emails
              </h2>
              <Link
                to="/emails"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>

          {recentEmails.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No emails found
              </h3>
              <p className="text-gray-600 mb-6">
                Your inbox is empty or we couldn't load your emails.
              </p>
              <div className="space-x-4">
                <button
                  onClick={handleRefresh}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Refresh
                </button>
                <Link
                  to="/compose"
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                >
                  Compose Email
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentEmails.map((email) => (
                <div
                  key={email.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !email.isRead
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Read/Unread indicator */}
                    <div className="shrink-0 pt-1">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          !email.isRead ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      ></div>
                    </div>

                    {/* Email content */}
                    <Link to={`/emails/${email.id}`} className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getSenderName(email.from)}
                            </p>
                            {email.hasAttachments && (
                              <svg
                                className="w-4 h-4 text-gray-400 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                              </svg>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                            {email.subject || "No Subject"}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {formatPreview(email.bodyPreview)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end space-y-2 shrink-0 ml-4">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(email.receivedDateTime)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMarkAsRead(email.id, email.isRead);
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              email.isRead
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {email.isRead ? "Mark Unread" : "Mark Read"}
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Debug Info
            </h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify(
                {
                  user: user?.email,
                  emailCount: recentEmails.length,
                  stats,
                  lastRefresh: new Date().toLocaleTimeString(),
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
