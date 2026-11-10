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
import { api } from '../../api/client.js';

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [apiError, setApiError] = useState(null);

  const validate = () => {
    const next = [];
    if (!username.trim()) next.push({ field: 'username', message: 'the username field is required' });
    else if (!USERNAME_RE.test(username.trim())) {
      next.push({ field: 'username', message: 'the username field contains invalid chars' });
    }
    if (!email.trim()) next.push({ field: 'email', message: 'the email field is required' });
    else if (!EMAIL_RE.test(email.trim())) {
      next.push({ field: 'email', message: 'the email field is not an email' });
    }
    if (!password) next.push({ field: 'password', message: 'the password field is required' });
    else if (password.length < 10) {
      next.push({ field: 'password', message: 'the password field is too short' });
    }
    setErrors(next);
    return next.length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    try {
      await api.register({ username: username.trim(), email: email.trim(), password });
      navigate('/login');
    } catch (err) {
      setApiError(err.data?.message || 'Registration failed');
    }
  };

  const fieldError = (field) => errors.find((x) => x.field === field)?.message;

  return (
    <EuiPageTemplate template="centeredBody" pageTitle="Register">
      <EuiForm component="form" onSubmit={onSubmit}>
        <EuiFormRow label="Username" isInvalid={!!fieldError('username')} error={fieldError('username')}>
          <EuiFieldText value={username} onChange={(e) => setUsername(e.target.value)} />
        </EuiFormRow>
        <EuiFormRow label="Email" isInvalid={!!fieldError('email')} error={fieldError('email')}>
          <EuiFieldText value={email} onChange={(e) => setEmail(e.target.value)} />
        </EuiFormRow>
        <EuiFormRow label="Password" isInvalid={!!fieldError('password')} error={fieldError('password')}>
          <EuiFieldText type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </EuiFormRow>
        {apiError && (
          <>
            <EuiCallOut title={apiError} color="danger" iconType="alert" />
            <EuiSpacer />
          </>
        )}
        <EuiButton type="submit" fill>
          Register
        </EuiButton>
        <EuiSpacer />
        <Link to="/login">Back to sign in</Link>
      </EuiForm>
    </EuiPageTemplate>
  );
}
