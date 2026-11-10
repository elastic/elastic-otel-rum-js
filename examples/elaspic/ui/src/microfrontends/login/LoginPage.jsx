import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPageTemplate,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { useAuth } from '../../auth/AuthContext.jsx';

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [apiError, setApiError] = useState(null);

  const validate = () => {
    const next = [];
    if (!username.trim()) next.push({ field: 'username', message: 'the username field is required' });
    else if (!USERNAME_RE.test(username.trim())) {
      next.push({ field: 'username', message: 'the username field contains invalid chars' });
    }
    if (!password) next.push({ field: 'password', message: 'the password field is required' });
    setErrors(next);
    return next.length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    try {
      await login(username.trim(), password);
      navigate('/pics');
    } catch (err) {
      setApiError(err.data?.message || 'Login failed');
    }
  };

  const fieldError = (field) => errors.find((x) => x.field === field)?.message;

  return (
    <EuiPageTemplate template="centeredBody" pageTitle="Sign in to Elaspic">
      <EuiForm component="form" onSubmit={onSubmit}>
        <EuiFormRow label="Username" isInvalid={!!fieldError('username')} error={fieldError('username')}>
          <EuiFieldText value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </EuiFormRow>
        <EuiFormRow label="Password" isInvalid={!!fieldError('password')} error={fieldError('password')}>
          <EuiFieldText
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </EuiFormRow>
        {apiError && (
          <>
            <EuiCallOut title={apiError} color="danger" iconType="alert" />
            <EuiSpacer />
          </>
        )}
        <EuiButton type="submit" fill>
          Sign in
        </EuiButton>
        <EuiSpacer />
        <Link to="/register">Create an account</Link>
      </EuiForm>
    </EuiPageTemplate>
  );
}
