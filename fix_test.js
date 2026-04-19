import fs from 'fs';

let content = fs.readFileSync('tests/auth.spec.ts', 'utf8');

const replacement = `
        it('should correctly encode the token in the URL', () => {
            // Mock UrlFetchApp
            const mockResponse = {
                getContentText: vi.fn().mockReturnValue(JSON.stringify({
                    aud: 'fake_google_client_id',
                    email: 'test@example.com'
                }))
            };
            global.UrlFetchApp.fetch = vi.fn().mockReturnValue(mockResponse);

            const tokenWithSpecialChars = 'abc_def.123-456.789';
            verifyGoogleToken(tokenWithSpecialChars);

            const expectedEncodedToken = encodeURIComponent(tokenWithSpecialChars);
            expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(\`https://oauth2.googleapis.com/tokeninfo?id_token=\${expectedEncodedToken}\`);
        });

        it('should reject tokens with invalid formats', () => {
            const invalidTokens = [
                'abc/def+123=', // contains invalid characters for base64url
                'abc.def', // missing signature
                'abc.def.ghi.jkl', // too many parts
                'abc..def' // empty payload
            ];

            invalidTokens.forEach(token => {
                global.UrlFetchApp.fetch = vi.fn();
                const result = verifyGoogleToken(token);
                expect(result).toBe(false);
                expect(global.UrlFetchApp.fetch).not.toHaveBeenCalled();
            });
        });
`;

content = content.replace(`
        it('should correctly encode the token in the URL', () => {
            // Mock UrlFetchApp
            const mockResponse = {
                getContentText: vi.fn().mockReturnValue(JSON.stringify({
                    aud: 'fake_google_client_id',
                    email: 'test@example.com'
                }))
            };
            global.UrlFetchApp.fetch = vi.fn().mockReturnValue(mockResponse);

            const tokenWithSpecialChars = 'abc/def+123=';
            verifyGoogleToken(tokenWithSpecialChars);

            const expectedEncodedToken = encodeURIComponent(tokenWithSpecialChars);
            expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(\`https://oauth2.googleapis.com/tokeninfo?id_token=\${expectedEncodedToken}\`);
        });`, replacement);

fs.writeFileSync('tests/auth.spec.ts', content);
console.log('tests/auth.spec.ts updated.');
