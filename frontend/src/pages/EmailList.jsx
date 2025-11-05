import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { emailService } from "../services/api";

function EmailList() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    totalCount: 0,
    hasMore: false,
  });
  const [updatingEmail, setUpdatingEmail] = useState(null);

  useEffect(() => {
    fetchEmails();
  }, [pagination.page]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await emailService.getEmails(
        pagination.page,
        pagination.pageSize
      );
      setEmails(response.data.value || []);
      setPagination((prev) => ({
        ...prev,
        totalCount: response.data["@odata.count"],
        hasMore: response.data.value.length === pagination.pageSize,
      }));
    } catch (error) {
      console.error("Error fetching emails:", error);
      setError(error.response?.data?.error || "Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (emailId, isRead) => {
    try {
      setUpdatingEmail(emailId);
      await emailService.updateEmail(emailId, { isRead: !isRead });
      // Update local state
      setEmails((prev) =>
        prev.map((email) =>
          email.id === emailId ? { ...email, isRead: !isRead } : email
        )
      );
    } catch (error) {
      console.error("Error updating email:", error);
      alert("Failed to update email status");
    } finally {
      setUpdatingEmail(null);
    }
  };

  const loadNext = () => {
    setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
  };

  const loadPrevious = () => {
    setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
  };

  const formatDate = (dateString) => {
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
  };

  const formatPreview = (preview) => {
    if (!preview) return "No preview available";
    return preview.length > 100 ? preview.substring(0, 100) + "..." : preview;
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading emails...</p>
        </div>
      </div>
    );
  }

  if (loading) return <div>Loading emails...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          {pagination.totalCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {pagination.totalCount} emails total
            </p>
          )}
        </div>
        <Link
          to="/compose"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Compose
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error: </strong> {error}
          <button
            onClick={fetchEmails}
            className="ml-4 text-red-600 underline text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {emails.length === 0 ? (
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
            <button
              onClick={fetchEmails}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            {emails.map((email) => (
              <div
                key={email.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !email.isRead ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
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
                            {email.from?.emailAddress?.name ||
                              email.from?.emailAddress?.address ||
                              "Unknown Sender"}
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
                            markAsRead(email.id, email.isRead);
                          }}
                          disabled={updatingEmail === email.id}
                          className={`text-xs px-2 py-1 rounded ${
                            email.isRead
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          } disabled:opacity-50`}
                        >
                          {updatingEmail === email.id
                            ? "..."
                            : email.isRead
                            ? "Mark Unread"
                            : "Mark Read"}
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ))}

            <div className="p-4 text-center border-t">
              {/* Load Previous Button */}
              {pagination.page > 1 && (
                <button
                  onClick={loadPrevious}
                  disabled={loading}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "<< Previous"}
                </button>
              )}

              {/* Load More Button */}
              {pagination.hasMore && (
                <button
                  onClick={loadNext}
                  disabled={loading}
                  className="bg-gray-100 mx-4 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Next >>"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EmailList;
