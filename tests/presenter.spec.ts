import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createResponse, createHtmlResponse, createHtmlPage } from '../presenter';

describe('presenter', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should create basic response with only status', () => {
        const result = createResponse('ok');

        expect(ContentService.createTextOutput).toHaveBeenCalledWith(
            JSON.stringify({ status: 'ok' })
        );
        expect(result.getContent()).toBe(JSON.stringify({ status: 'ok' }));
    });

    it('should create response with status and code', () => {
        const result = createResponse('error', 400);

        expect(ContentService.createTextOutput).toHaveBeenCalledWith(
            JSON.stringify({ status: 'error', code: 400 })
        );
        expect(result.getContent()).toBe(JSON.stringify({ status: 'error', code: 400 }));
    });

    it('should create response with status, code and message', () => {
        const result = createResponse('error', 500, 'Internal Server Error');

        expect(ContentService.createTextOutput).toHaveBeenCalledWith(
            JSON.stringify({
                status: 'error',
                code: 500,
                message: 'Internal Server Error'
            })
        );
        expect(result.getContent()).toBe(JSON.stringify({
            status: 'error',
            code: 500,
            message: 'Internal Server Error'
        }));
    });

    it('should create response and set MIME type when output_mimetype is provided', () => {
        const mockSetMimeType = vi.fn().mockReturnThis();
        (ContentService.createTextOutput as any).mockReturnValue({
            getContent: () => JSON.stringify({ status: 'ok' }),
            setMimeType: mockSetMimeType
        });

        const result = createResponse('ok', undefined, undefined, ContentService.MimeType.JSON);

        expect(ContentService.createTextOutput).toHaveBeenCalled();
        expect(mockSetMimeType).toHaveBeenCalledWith('JSON');
        expect(result).toBeDefined();
    });

    it('should handle complex object as data when status is success', () => {
        const complexData = { detail: 'something happened', timestamp: 123456789 };
        const result = createResponse('success', 200, complexData);

        expect(ContentService.createTextOutput).toHaveBeenCalledWith(
            JSON.stringify({
                status: 'success',
                code: 200,
                data: complexData
            })
        );
    });

    it('should merge message into top-level when status is null and message is an object', () => {
        const challenge = { "hub.challenge": "test_123" };
        const result = createResponse(null, undefined, challenge);

        expect(ContentService.createTextOutput).toHaveBeenCalledWith(
            JSON.stringify({
                "hub.challenge": "test_123"
            })
        );
    });

    it('should create HTML response using createHtmlResponse', () => {
        const content = 'Hello World';
        createHtmlResponse(content);

        expect(HtmlService.createHtmlOutput).toHaveBeenCalledWith(content);
    });

    it('should create HTML page using createHtmlPage', () => {
        const filename = 'index';
        const title = 'Page Title';
        const mockOutput = { setTitle: vi.fn() };
        (HtmlService.createHtmlOutputFromFile as any).mockReturnValue(mockOutput);

        createHtmlPage(filename, title);

        expect(HtmlService.createHtmlOutputFromFile).toHaveBeenCalledWith(filename);
        expect(mockOutput.setTitle).toHaveBeenCalledWith(title);
    });
});
