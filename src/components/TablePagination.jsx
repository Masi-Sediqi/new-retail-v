const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function TablePagination({ page, totalPages, setPage, totalItems, pageSize = 20, setPageSize, labels = {} }) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <div className="table-pagination">
      <span>{labels.showing
        ? labels.showing(totalItems ? first : 0, last, totalItems)
        : `Showing ${totalItems ? first : 0} to ${last} of ${totalItems} records`}</span>
      <div>
        {setPageSize && (
          <>
            <label>{labels.rowsPerPage || "Rows per page"}</label>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </>
        )}
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1}>
          {labels.previous || "Previous"}
        </button>
        <strong>{labels.page ? labels.page(page, totalPages) : `Page ${page} of ${totalPages}`}</strong>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
          {labels.next || "Next"}
        </button>
      </div>
    </div>
  );
}

export default TablePagination;
