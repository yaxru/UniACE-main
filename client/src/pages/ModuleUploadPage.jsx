import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../lib/api';

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapRow(rawRow, listType) {
  const mapped = {
    studentName: '',
    itNumber: '',
    groupNo: '',
    groupName: '',
    availableDates: '',
    timeSlots: '',
  };

  for (const [rawKey, rawValue] of Object.entries(rawRow || {})) {
    const key = normalizeKey(rawKey);
    const value = String(rawValue ?? '').trim();

    if (!value) continue;

    if (['studentname', 'studentsname', 'lecturername', 'lecturersname', 'name'].includes(key)) {
      mapped.studentName = value;
    }
    if (['itnumber', 'itno', 'it'].includes(key)) mapped.itNumber = value;
    if (listType === 'lecturer') {
      if (['availabledates', 'availabledate', 'datesavailable', 'availabilitydates'].includes(key)) {
        mapped.availableDates = value;
      }
      if (['timeslots', 'timeslot', 'slot', 'availabletimeslots'].includes(key)) {
        mapped.timeSlots = value;
      }
    } else {
      if (['groupno', 'groupnumber', 'group'].includes(key)) mapped.groupNo = value;
      if (['groupname', 'groupteamname'].includes(key)) mapped.groupName = value;
    }
  }

  return mapped;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function buildEvaluationGroups(studentRoster, lecturerRoster) {
  const students = Array.isArray(studentRoster?.rows) ? studentRoster.rows : [];
  const lecturers = (Array.isArray(lecturerRoster?.rows) ? lecturerRoster.rows : []).filter(
    (item) => item.studentName && item.itNumber
  );

  const grouped = new Map();

  for (const student of students) {
    const groupNo = String(student.groupNo || '').trim();
    const groupName = String(student.groupName || '').trim();
    if (!groupNo || !groupName) continue;

    const key = `${groupNo}::${groupName.toLowerCase()}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        groupNo,
        groupName,
        students: [],
      });
    }

    grouped.get(key).students.push({
      studentName: student.studentName,
      itNumber: student.itNumber,
    });
  }

  const groups = Array.from(grouped.values()).sort((a, b) => {
    const noCompare = String(a.groupNo).localeCompare(String(b.groupNo), undefined, { numeric: true });
    if (noCompare !== 0) return noCompare;
    return String(a.groupName).localeCompare(String(b.groupName));
  });

  return groups.map((group, index) => ({
    ...group,
    evaluator: lecturers.length > 0 ? lecturers[index % lecturers.length] : null,
  }));
}

const YEAR_LABELS = {
  year1: 'Year 1',
  year2: 'Year 2',
  year3: 'Year 3',
  year4: 'Year 4',
};

export default function ModuleUploadPage() {
  const [searchParams] = useSearchParams();
  const yearKey = searchParams.get('year') || '';
  const moduleName = searchParams.get('module') || '';
  const listTypeParam = searchParams.get('listType') || 'student';
  const listType = listTypeParam === 'lecturer' ? 'lecturer' : 'student';

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [latestRoster, setLatestRoster] = useState(null);
  const [loadingEvaluation, setLoadingEvaluation] = useState(true);
  const [latestStudentRoster, setLatestStudentRoster] = useState(null);
  const [latestLecturerRoster, setLatestLecturerRoster] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const readableYear = YEAR_LABELS[yearKey] || yearKey;
  const isValidPage = !!YEAR_LABELS[yearKey] && !!moduleName;
  const primaryLabel = listType === 'lecturer' ? 'Lecturer Name' : 'Student Name';
  const thirdLabel = listType === 'lecturer' ? 'Available Dates' : 'Group No';
  const fourthLabel = listType === 'lecturer' ? 'Time Slots' : 'Group Name';
  const pageTitle = listType === 'lecturer' ? 'Upload Lecturer List' : 'Upload Student List';

  const validRows = useMemo(
    () => rows.filter((row) => {
      if (!row.studentName || !row.itNumber) return false;
      if (listType === 'lecturer') {
        return row.availableDates && row.timeSlots;
      }
      return row.groupNo && row.groupName;
    }),
    [rows, listType]
  );

  const evaluationGroups = useMemo(
    () => buildEvaluationGroups(latestStudentRoster, latestLecturerRoster),
    [latestStudentRoster, latestLecturerRoster]
  );

  useEffect(() => {
    if (!isValidPage) {
      setLoadingLatest(false);
      setLoadingEvaluation(false);
      return;
    }
    fetchLatest();
    fetchEvaluationData();
  }, [yearKey, moduleName, listType]);

  async function fetchLatest() {
    setLoadingLatest(true);
    try {
      const { data } = await api.get('/module-rosters/latest', {
        params: { yearKey, moduleName, listType },
      });
      setLatestRoster(data);
    } catch {
      setLatestRoster(null);
    } finally {
      setLoadingLatest(false);
    }
  }

  async function fetchEvaluationData() {
    setLoadingEvaluation(true);
    try {
      const [studentRes, lecturerRes] = await Promise.all([
        api.get('/module-rosters/latest', { params: { yearKey, moduleName, listType: 'student' } }),
        api.get('/module-rosters/latest', { params: { yearKey, moduleName, listType: 'lecturer' } }),
      ]);
      setLatestStudentRoster(studentRes.data || null);
      setLatestLecturerRoster(lecturerRes.data || null);
    } catch {
      setLatestStudentRoster(null);
      setLatestLecturerRoster(null);
    } finally {
      setLoadingEvaluation(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    setError('');
    setSuccess('');

    if (!file) {
      setFileName('');
      setRows([]);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const mappedRows = jsonRows.map((row) => mapRow(row, listType));
        setRows(mappedRows);
      } catch {
        setRows([]);
        setError('Failed to read Excel file. Please upload a valid .xlsx or .xls file.');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    if (!fileName) {
      setError('Please choose an Excel file first.');
      return;
    }

    if (validRows.length === 0) {
      setError(`No valid rows found. Required columns: ${primaryLabel.toLowerCase()}, IT number, ${thirdLabel.toLowerCase()}, ${fourthLabel.toLowerCase()}.`);
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/module-rosters', {
        listType,
        yearKey,
        moduleName,
        sourceFileName: fileName,
        rows: validRows,
      });
      setSuccess('Excel roster uploaded successfully.');
      await Promise.all([fetchLatest(), fetchEvaluationData()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload roster.');
    } finally {
      setUploading(false);
    }
  }

  if (!isValidPage) {
    return (
      <div className="modules-page-card">
        <h2>Invalid Module Page</h2>
        <p className="error-msg">Missing or invalid year/module values.</p>
        <Link to="/profile/modules" className="btn btn-secondary">Back to Manage Modules</Link>
      </div>
    );
  }

  return (
    <div className="modules-page-card">
      <div className="modules-page-header">
        <h2>{pageTitle}</h2>
        <p>
          {readableYear} / {moduleName}
        </p>
      </div>

      <div className="upload-roster-box">
        <p className="upload-hint">
          Upload an Excel sheet with columns: {primaryLabel}, IT Number, {thirdLabel}, {fourthLabel}.
        </p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />

        {fileName && (
          <p className="upload-file-name">
            Selected file: <strong>{fileName}</strong>
          </p>
        )}

        {rows.length > 0 && (
          <p className="upload-summary">
            Parsed rows: {rows.length} | Valid rows: {validRows.length}
          </p>
        )}

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <div className="modules-actions">
          <Link to="/profile/modules" className="btn-ghost-sm">Back</Link>
          <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Excel'}
          </button>
        </div>
      </div>

      <div className="module-latest-box">
        <h3>Latest Uploaded Sheet</h3>

        {loadingLatest && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading latest data…</p>}

        {!loadingLatest && !latestRoster && (
          <p className="home-modules-empty">No sheet uploaded yet for this module.</p>
        )}

        {!loadingLatest && latestRoster && (
          <>
            <p className="upload-summary">
              Uploaded by @{latestRoster.uploadedBy?.username || 'unknown'} on {formatDate(latestRoster.createdAt)}
            </p>
            <div className="roster-table-wrap">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>{primaryLabel}</th>
                    <th>IT Number</th>
                    <th>{thirdLabel}</th>
                    <th>{fourthLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRoster.rows.map((row, index) => (
                    <tr key={index}>
                      <td>{row.studentName}</td>
                      <td>{row.itNumber}</td>
                      <td>{listType === 'lecturer' ? row.availableDates : row.groupNo}</td>
                      <td>{listType === 'lecturer' ? row.timeSlots : row.groupName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="module-latest-box">
        <h3>Assignment Evaluation Groups</h3>
        <p className="upload-summary">
          Groups are built from the latest student list and assigned to lecturers from the latest lecturer list for this module.
        </p>

        {loadingEvaluation && <p className="state-msg" style={{ textAlign: 'left', padding: 0 }}>Loading evaluation groups…</p>}

        {!loadingEvaluation && !latestStudentRoster && (
          <p className="home-modules-empty">Upload a student list first to build assignment evaluation groups.</p>
        )}

        {!loadingEvaluation && latestStudentRoster && !latestLecturerRoster && (
          <p className="home-modules-empty">Upload a lecturer list to assign evaluators to each student group.</p>
        )}

        {!loadingEvaluation && latestStudentRoster && latestLecturerRoster && evaluationGroups.length === 0 && (
          <p className="home-modules-empty">No valid student groups found in the latest student list.</p>
        )}

        {!loadingEvaluation && latestStudentRoster && latestLecturerRoster && evaluationGroups.length > 0 && (
          <div className="evaluation-panel-grid">
            {evaluationGroups.map((group) => (
              <article key={`${group.groupNo}-${group.groupName}`} className="evaluation-panel">
                <div className="evaluation-panel-head">
                  <h4>{group.groupName}</h4>
                  <span>Group {group.groupNo}</span>
                </div>

                <div className="evaluation-panel-evaluator">
                  <strong>Evaluator:</strong>{' '}
                  {group.evaluator
                    ? `${group.evaluator.studentName} (${group.evaluator.itNumber})`
                    : 'Not assigned'}
                </div>

                {group.evaluator && (
                  <div className="evaluation-panel-evaluator-meta">
                    <span>{group.evaluator.availableDates || '-'}</span>
                    <span>{group.evaluator.timeSlots || '-'}</span>
                  </div>
                )}

                <div className="evaluation-panel-students">
                  <strong>Students ({group.students.length})</strong>
                  <ul>
                    {group.students.map((student) => (
                      <li key={`${group.groupNo}-${student.itNumber}`}>
                        {student.studentName} ({student.itNumber})
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
