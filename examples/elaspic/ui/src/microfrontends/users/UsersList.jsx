import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EuiBasicTable, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { api } from '../../api/client.js';
import { ErrorBanner } from '../../components/ErrorBanner.jsx';

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const load = () =>
    api
      .users()
      .then(({ data }) => {
        setUsers(data);
        setError(null);
      })
      .catch(() => setError('We could not load the user list.'));

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <EuiPageHeader pageTitle="Users" />
      <EuiSpacer />
      {error && (
        <ErrorBanner title={error} onRetry={load}>
          <p>There may be a temporary connection issue.</p>
        </ErrorBanner>
      )}
      <EuiBasicTable
        tableCaption="Registered users. Select a row to view that user's gallery."
        items={users}
        columns={[
          { field: 'username', name: 'Username', render: (username) => <strong>{username}</strong> },
          {
            field: 'id',
            name: 'User ID',
            mobileOptions: { hide: true },
          },
        ]}
        rowProps={(item) => ({
          onClick: () => navigate(`/users/${item.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </>
  );
}
