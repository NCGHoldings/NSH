// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV } from './csvExport';

// Mock URL and Blob since we are in a JSDOM environment but might not have full Blob support in all environments or want to avoid actual download triggers
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('exportToCSV', () => {
    let linkSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        linkSpy = {
            setAttribute: vi.fn(),
            click: vi.fn(),
            style: {},
            remove: vi.fn()
        };
        // Mock document.createElement('a')
        vi.spyOn(document, 'createElement').mockReturnValue(linkSpy);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => { });
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => { });
    });

    it('should correctly format CSV data with headers and rows', () => {
        const data = [
            { id: 1, name: 'John Doe', role: 'Admin' },
            { id: 2, name: 'Jane "Smith", MD', role: 'Security' }
        ];
        const columns = [
            { header: 'ID', key: 'id' },
            { header: 'Name', key: 'name' },
            { header: 'Role', key: 'role' }
        ];

        // Intercept Blob constructor to check content
        const BlobSpy = vi.spyOn(global, 'Blob').mockImplementation(function (content) {
            this.content = content;
            return this;
        });

        exportToCSV(data, columns, 'test-export');

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(linkSpy.setAttribute).toHaveBeenCalledWith('download', 'test-export.csv');

        // Extract the content passed to Blob
        const blobContent = BlobSpy.mock.calls[0][0][0];
        const lines = blobContent.split('\n');

        expect(lines[0]).toBe('ID,Name,Role');
        expect(lines[1]).toBe('"1","John Doe","Admin"');
        expect(lines[2]).toBe('"2","Jane ""Smith"", MD","Security"');
    });

    it('should use col.render if provided', () => {
        const data = [{ time: '2026-01-16T12:00:00Z' }];
        const columns = [
            { header: 'Time', key: 'time', render: (val) => 'Formatted Time' }
        ];

        const BlobSpy = vi.spyOn(global, 'Blob');
        exportToCSV(data, columns, 'test');

        const blobContent = BlobSpy.mock.calls[0][0][0];
        expect(blobContent).toContain('"Formatted Time"');
    });

    it('should handle missing values gracefully', () => {
        const data = [{ name: null, age: undefined }];
        const columns = [
            { header: 'Name', key: 'name' },
            { header: 'Age', key: 'age' }
        ];

        const BlobSpy = vi.spyOn(global, 'Blob');
        exportToCSV(data, columns, 'test');

        const blobContent = BlobSpy.mock.calls[0][0][0];
        expect(blobContent).toContain('"",""');
    });
});
