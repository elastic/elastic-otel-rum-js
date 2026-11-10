import { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCommentList,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useAuth } from '../auth/AuthContext.jsx';

export function CommentPanel({
  loadComments,
  postComment,
  putComment,
  deleteComment,
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState(null);

  const refresh = async () => {
    const { data } = await loadComments();
    setComments(data);
  };

  useEffect(() => {
    refresh().catch(() => setError('Failed to load comments'));
  }, []);

  const onAdd = async () => {
    setError(null);
    try {
      await postComment(text);
      setText('');
      await refresh();
    } catch (e) {
      setError(e.data?.message || 'Could not add comment');
    }
  };

  const onSaveEdit = async () => {
    try {
      await putComment(editingId, editText);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError(e.data?.message || 'Could not update comment');
    }
  };

  const list = comments.map((c) => ({
    username: c.author,
    timelineAvatar: c.author.slice(0, 1).toUpperCase(),
    event: (
      <>
        <EuiText size="s">{c.comment}</EuiText>
        {c.author === user?.username && editingId !== c.id && (
          <>
            <EuiSpacer size="s" />
            <EuiButtonEmpty size="xs" onClick={() => { setEditingId(c.id); setEditText(c.comment); }}>
              Edit
            </EuiButtonEmpty>
            <EuiButtonEmpty size="xs" color="danger" onClick={() => deleteComment(c.id).then(refresh)}>
              Delete
            </EuiButtonEmpty>
          </>
        )}
        {editingId === c.id && (
          <>
            <EuiSpacer size="s" />
            <EuiFieldText value={editText} onChange={(e) => setEditText(e.target.value)} fullWidth />
            <EuiSpacer size="s" />
            <EuiButton size="s" onClick={onSaveEdit}>Save</EuiButton>
            <EuiButtonEmpty size="s" onClick={() => setEditingId(null)}>Cancel</EuiButtonEmpty>
          </>
        )}
      </>
    ),
  }));

  return (
    <>
      <EuiText>
        <h3>Comments</h3>
      </EuiText>
      <EuiSpacer />
      <EuiCommentList comments={list} />
      <EuiSpacer size="l" />
      <EuiForm>
        <EuiFormRow label="Add comment" fullWidth>
          <EuiFieldText value={text} onChange={(e) => setText(e.target.value)} fullWidth />
        </EuiFormRow>
        {error && (
          <EuiText color="danger" size="s">
            {error}
          </EuiText>
        )}
        <EuiSpacer />
        <EuiButton onClick={onAdd} fill>
          Post
        </EuiButton>
      </EuiForm>
    </>
  );
}