/**
 * Standardized CSV Export Utility
 * 
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions { header: string, key: string, render: function }
 * @param {string} filename - Desired filename
 */
export const exportToCSV = (data, columns, filename) => {
    if (!data || data.length === 0) {
        console.warn("No data provided for CSV export");
        return;
    }

    const headers = columns.map(col => col.header).join(',');

    const rows = data.map(row =>
        columns.map(col => {
            let val = row[col.key];
            if (col.render) {
                // If the render function returns a React element (Badge/Icon), 
                // it might not be suitable for CSV unless we handle it.
                // However, in these tables, render often returns strings or simple values 
                // when called with the data.
                try {
                    const rendered = col.render(val, row);
                    // Basic check: if it's a React element, we might need the raw value or a plain string
                    if (typeof rendered === 'object' && rendered !== null && rendered.$$typeof) {
                        // Fallback to raw value if render returns JSX
                        val = val !== undefined && val !== null ? val : '';
                    } else {
                        val = rendered;
                    }
                } catch (e) {
                    console.error("CSV Render Error:", e);
                }
            }

            // Escape double quotes by doubling them and wrap field in double quotes
            const escaped = String(val ?? '').replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',')
    ).join('\n');

    const csvContent = headers + "\n" + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
