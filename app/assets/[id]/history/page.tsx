
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API_URL = 'http://localhost:3001';

type HistoryUser = {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
};

type HistoryAsset = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
};

type AssignmentHistory = {
  id: number;
  asset: HistoryAsset;
  assignedTo: HistoryUser;
  assignedBy: HistoryUser | null;
  assignedAt: string;
  returnedAt: string | null;
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '9px 15px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
};

function formatDate(date: string | null): string {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return parsedDate.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong.';
}

async function getResponseError(response: Response): Promise<string> {
  const errorData = await response.json().catch(() => null);

  if (response.status === 401) {
    sessionStorage.removeItem('access_token');
    window.location.assign('/login');
    return 'Your session has expired. Please log in again.';
  }

  if (response.status === 403) {
    return 'You do not have permission to view this history.';
  }

  if (errorData?.message) {
    return Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message;
  }

  return `Could not load assignment history. (HTTP ${response.status})`;
}

export default function AssetHistoryPage() {
  const params = useParams<{ id: string }>();
  const assetId = params.id;

  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      setError('');

      try {
        const token = sessionStorage.getItem('access_token');

        if (!token) {
          window.location.assign('/login');
          throw new Error('Please log in to continue.');
        }

        const response = await fetch(
          `${API_URL}/assets/${assetId}/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(await getResponseError(response));
        }

        const data = await response.json();

        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    if (assetId) {
      void loadHistory();
    }
  }, [assetId]);

  const asset = history.length > 0 ? history[0].asset : null;

  const activeAssignments = history.filter(
    (item) => !item.returnedAt,
  ).length;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        padding: 24,
        color: '#111827',
      }}
    >
      <div style={{ maxWidth: 1250, margin: '0 auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 15,
            marginBottom: 25,
          }}
        >
          <div>
            <h1 style={{ fontSize: 27, fontWeight: 800, margin: 0 }}>
              Asset Assignment History
            </h1>

            <p style={{ color: '#6b7280', marginTop: 7 }}>
              Complete assignment and return records for this asset.
            </p>
          </div>

          <Link
            href="/"
            style={{
              ...buttonStyle,
              background: '#2563eb',
              color: '#fff',
            }}
          >
            ← Back to Assets
          </Link>
        </header>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: 14,
              borderRadius: 7,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {/* Asset information */}
        {!loading && !error && (
          <section
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 10,
              marginBottom: 22,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 16px',
              }}
            >
              Asset Information
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 18,
              }}
            >
              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Asset ID
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {assetId}
                </p>
              </div>

              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Asset Tag
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {asset?.assetTag || 'Not available'}
                </p>
              </div>

              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Asset Name
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {asset?.name || 'Not available'}
                </p>
              </div>

              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Category
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {asset?.category || 'Not available'}
                </p>
              </div>

              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Brand / Model
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {[asset?.brand, asset?.model]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </p>
              </div>

              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Total Assignment Records
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {history.length}
                </p>
              </div>

              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                  Active Assignment Records
                </p>
                <p style={{ fontWeight: 700, margin: '5px 0 0' }}>
                  {activeAssignments}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* History table */}
        <section
          style={{
            background: '#fff',
            padding: 20,
            borderRadius: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>
              Assignment Records
            </h2>

            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
              Newest assignment records appear first.
            </p>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: 25 }}>
              Loading assignment history...
            </p>
          ) : error ? null : history.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 35,
                color: '#6b7280',
              }}
            >
              <p style={{ fontWeight: 600, margin: 0 }}>
                No assignment history found.
              </p>
              <p style={{ fontSize: 13, marginTop: 7 }}>
                Assignment records will appear here after this asset is
                assigned to an employee.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 1050,
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                    {[
                      'Employee',
                      'Department',
                      'Assigned By',
                      'Assignment Date',
                      'Return Date',
                      'Status',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #e5e7eb',
                          color: '#4b5563',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {record.assignedTo?.name || 'Unknown employee'}
                        </div>

                        <div
                          style={{
                            color: '#6b7280',
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          {record.assignedTo?.email || '—'}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {record.assignedTo?.department || '—'}
                      </td>

                      <td
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {record.assignedBy ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {record.assignedBy.name}
                            </div>
                            <div
                              style={{
                                color: '#6b7280',
                                fontSize: 11,
                                marginTop: 4,
                              }}
                            >
                              {record.assignedBy.email}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#92400e' }}>
                            Not recorded (legacy assignment)
                          </span>
                        )}
                      </td>

                      <td
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #eee',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(record.assignedAt)}
                      </td>

                      <td
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #eee',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(record.returnedAt)}
                      </td>

                      <td
                        style={{
                          padding: 13,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '5px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: record.returnedAt
                              ? '#dcfce7'
                              : '#dbeafe',
                            color: record.returnedAt
                              ? '#166534'
                              : '#1d4ed8',
                          }}
                        >
                          {record.returnedAt ? 'Returned' : 'Currently Assigned'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer
          style={{
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 12,
            padding: '24px 0 8px',
          }}
        >
          IT Inventory Management System
        </footer>
      </div>
    </main>
  );
}
