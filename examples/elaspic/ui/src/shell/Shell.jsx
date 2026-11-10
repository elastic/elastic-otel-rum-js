import { EuiPage, EuiPageBody, EuiPageSidebar, EuiPageSection } from '@elastic/eui';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';

const AUTH_HIDDEN = new Set(['/login', '/register']);

export function Shell() {
  const { pathname } = useLocation();
  const showChrome = !AUTH_HIDDEN.has(pathname);

  if (!showChrome) {
    return <Outlet />;
  }

  return (
    <>
      <Header />
      <EuiPage paddingSize="l" style={{ marginTop: 48 }}>
        <EuiPageSidebar paddingSize="m" sticky>
          <Sidebar />
        </EuiPageSidebar>
        <EuiPageBody>
          <EuiPageSection>
            <Outlet />
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </>
  );
}
