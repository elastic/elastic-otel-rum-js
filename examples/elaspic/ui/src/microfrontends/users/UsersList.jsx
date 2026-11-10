import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EuiBasicTable, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { api } from '../../api/client.js';

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.users().then(({ data }) => setUsers(data));
  }, []);

  return (
    <>
      <EuiPageHeader pageTitle="Users" />
      <EuiSpacer />
      <EuiBasicTable
        items={users}
        columns={[
          { field: 'username', name: 'Username' },
          { field: 'id', name: 'User ID' },
        ]}
        rowProps={(item) => ({
          onClick: () => navigate(`/users/${item.id}`),
          style: { cursor: 'pointer' },
        })}
      />
    </>
  );
}
