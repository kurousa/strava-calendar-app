import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveMapToDrive, getOrCreateMapFolder } from '../maps';

describe('maps.ts', () => {
    beforeEach(() => {
        vi.stubGlobal('sendErrorEmail', vi.fn());
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getOrCreateMapFolder', () => {
        it('should return existing folder if it exists', () => {
            const mockFolder = { name: 'Strava_Route_Maps' };
            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFolder)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders)
            });

            const folder = getOrCreateMapFolder();
            expect(folder).toBe(mockFolder);
            expect(DriveApp.getFoldersByName).toHaveBeenCalledWith('Strava_Route_Maps');
        });

        it('should create new folder if it does not exist', () => {
            const mockFolder = { name: 'Strava_Route_Maps' };
            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(false)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders),
                createFolder: vi.fn().mockReturnValue(mockFolder)
            });

            const folder = getOrCreateMapFolder();
            expect(folder).toBe(mockFolder);
            expect(DriveApp.createFolder).toHaveBeenCalledWith('Strava_Route_Maps');
        });
    });

    describe('saveMapToDrive', () => {
        const mockActivity = {
            id: 12345,
            map: {
                summary_polyline: 'abc'
            }
        };

        it('should return null if activity has no polyline', () => {
            const result = saveMapToDrive({ id: 1 } as any);
            expect(result).toBeNull();
        });

        it('should return existing file if it already exists', () => {
            const mockFile = { getUrl: () => 'http://map' };
            const mockFiles = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFile)
            };
            const mockFolder = {
                getFilesByName: vi.fn().mockReturnValue(mockFiles)
            };

            // Mock getOrCreateMapFolder indirectly by mocking DriveApp calls it makes
            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFolder)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders)
            });

            const result = saveMapToDrive(mockActivity as any);
            expect(result).toBe(mockFile);
            expect(mockFolder.getFilesByName).toHaveBeenCalledWith('strava_map_12345.png');
        });

        it('should return null and log error if map generation fails', () => {
            const mockFiles = {
                hasNext: vi.fn().mockReturnValue(false)
            };
            const mockFolder = {
                getFilesByName: vi.fn().mockReturnValue(mockFiles),
            };

            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFolder)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders)
            });

            // Mock getBlob to throw an error
            const errorMsg = 'Failed to generate map blob';
            const mockMap = {
                setSize: vi.fn().mockReturnThis(),
                setLanguage: vi.fn().mockReturnThis(),
                addPath: vi.fn().mockReturnThis(),
                getBlob: vi.fn().mockImplementation(() => {
                    throw new Error(errorMsg);
                })
            };
            vi.stubGlobal('Maps', {
                ...(global as any).Maps,
                newStaticMap: vi.fn().mockReturnValue(mockMap)
            });

            const result = saveMapToDrive(mockActivity as any);
            expect(result).toBeNull();
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('マップの保存に失敗しました'));
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
            expect(sendErrorEmail).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
        });

        it('should not crash if sendErrorEmail is undefined when map generation fails', () => {
            vi.stubGlobal('sendErrorEmail', undefined);

            const mockFiles = {
                hasNext: vi.fn().mockReturnValue(false)
            };
            const mockFolder = {
                getFilesByName: vi.fn().mockReturnValue(mockFiles),
            };

            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFolder)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders)
            });

            const errorMsg = 'Failed to generate map blob';
            const mockMap = {
                setSize: vi.fn().mockReturnThis(),
                setLanguage: vi.fn().mockReturnThis(),
                addPath: vi.fn().mockReturnThis(),
                getBlob: vi.fn().mockImplementation(() => {
                    throw new Error(errorMsg);
                })
            };
            vi.stubGlobal('Maps', {
                ...(global as any).Maps,
                newStaticMap: vi.fn().mockReturnValue(mockMap)
            });

            const result = saveMapToDrive(mockActivity as any);
            expect(result).toBeNull();
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('マップの保存に失敗しました'));
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
        });

        it('should return null and log error if file creation fails', () => {
            const mockFiles = {
                hasNext: vi.fn().mockReturnValue(false)
            };
            const mockFolder = {
                getFilesByName: vi.fn().mockReturnValue(mockFiles),
                createFile: vi.fn().mockImplementation(() => {
                    throw new Error('Drive API error');
                })
            };

            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFolder)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders)
            });

            const mockMap = {
                setSize: vi.fn().mockReturnThis(),
                setLanguage: vi.fn().mockReturnThis(),
                addPath: vi.fn().mockReturnThis(),
                getBlob: vi.fn().mockReturnValue('mock-blob')
            };
            vi.stubGlobal('Maps', {
                ...(global as any).Maps,
                newStaticMap: vi.fn().mockReturnValue(mockMap)
            });

            const result = saveMapToDrive(mockActivity as any);
            expect(result).toBeNull();
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('マップの保存に失敗しました'));
            expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Drive API error'));
            expect(sendErrorEmail).toHaveBeenCalledWith(expect.stringContaining('Drive API error'));
        });

        it('should create and return new file if it does not exist', () => {
            const mockFile = {
                setName: vi.fn().mockReturnThis(),
                setSharing: vi.fn().mockReturnThis(),
                getUrl: () => 'http://new-map'
            };
            const mockFiles = {
                hasNext: vi.fn().mockReturnValue(false)
            };
            const mockFolder = {
                getFilesByName: vi.fn().mockReturnValue(mockFiles),
                createFile: vi.fn().mockReturnValue(mockFile)
            };

            const mockFolders = {
                hasNext: vi.fn().mockReturnValue(true),
                next: vi.fn().mockReturnValue(mockFolder)
            };
            vi.stubGlobal('DriveApp', {
                ...(global as any).DriveApp,
                getFoldersByName: vi.fn().mockReturnValue(mockFolders)
            });

            const result = saveMapToDrive(mockActivity as any);
            expect(result).toBe(mockFile);
            expect(mockFolder.createFile).toHaveBeenCalled();
            expect(mockFile.setName).toHaveBeenCalledWith('strava_map_12345.png');
            expect(mockFile.setSharing).toHaveBeenCalledWith(
                DriveApp.Access.PRIVATE,
                DriveApp.Permission.EDIT
            );
        });
    });
});
