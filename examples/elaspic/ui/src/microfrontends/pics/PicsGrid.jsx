import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EuiButton,
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { api } from '../../api/client.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export default function PicsGrid() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [pics, setPics] = useState([]);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.pics();
    setPics(data);
  }, []);

  useEffect(() => {
    load().catch(() => setError('Failed to load gallery'));
  }, [load]);

  const onAddClick = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    if (!ALLOWED.includes(file.type)) {
      setUploadError('Invalid image type');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Image must be 5 MB or smaller');
      return;
    }
    try {
      await api.uploadPic(file);
      await load();
    } catch (err) {
      const msg =
        err.data?.errors?.[0]?.message || err.data?.message || 'Upload failed';
      setUploadError(msg);
    }
  };

  return (
    <>
      <EuiPageHeader
        pageTitle="My pictures"
        rightSideItems={[
          <EuiButton key="add" fill iconType="plusInCircle" onClick={onAddClick}>
            Add
          </EuiButton>,
        ]}
      />
      <input ref={fileRef} type="file" accept={ALLOWED.join(',')} hidden onChange={onFile} />
      {uploadError && (
        <>
          <EuiCallOut title={uploadError} color="danger" iconType="alert" />
          <EuiSpacer />
        </>
      )}
      {error && (
        <>
          <EuiCallOut title={error} color="danger" iconType="alert" />
          <EuiSpacer />
        </>
      )}
      <EuiFlexGrid columns={3} gutterSize="m">
        {pics.map((p) => (
          <EuiFlexItem key={p.id}>
            <EuiCard
              textAlign="left"
              title={p.author}
              onClick={() => navigate(`/pics/${p.id}`)}
              image={<img src={p.thumbnailBase64} alt="" style={{ width: '100%', objectFit: 'cover' }} />}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
}
