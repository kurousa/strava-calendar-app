import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAthleteWeight, __syncAthleteData } from '../athlete';

describe('athlete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('Logger', { log: vi.fn() });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getAthleteWeight', () => {
        it('should return weight when profile and weight are present', () => {
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => ({ weight: 65.5 })));
            const result = getAthleteWeight();
            expect(result).toBe(65.5);
        });

        it('should return null when profile does not have weight', () => {
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => ({ weight: null })));
            const result = getAthleteWeight();
            expect(result).toBeNull();
        });

        it('should return null when profile is null', () => {
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => null));
            const result = getAthleteWeight();
            expect(result).toBeNull();
        });
    });

    describe('__syncAthleteData', () => {
        it('should log athlete info including main bike name', () => {
            const mockProfile = {
                firstname: 'Taro',
                lastname: 'Yamada',
                weight: 65.5,
                ftp: 250,
                bikes: [
                    { id: 'b1', primary: false, name: 'Bike 1' },
                    { id: 'b2', primary: true, name: 'Main Bike' }
                ]
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            __syncAthleteData();

            expect(global.Logger.log).toHaveBeenCalledWith('アスリート: Taro Yamada');
            expect(global.Logger.log).toHaveBeenCalledWith('体重: 65.5kg, FTP: 250W, メインバイク: Main Bike');
        });

        it('should log "未設定" if no primary bike is found', () => {
            const mockProfile = {
                firstname: 'Taro',
                lastname: 'Yamada',
                weight: 65.5,
                ftp: 250,
                bikes: [
                    { id: 'b1', primary: false, name: 'Bike 1' }
                ]
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            __syncAthleteData();

            expect(global.Logger.log).toHaveBeenCalledWith('アスリート: Taro Yamada');
            expect(global.Logger.log).toHaveBeenCalledWith('体重: 65.5kg, FTP: 250W, メインバイク: 未設定');
        });

        it('should log "未設定" if bikes array is empty', () => {
            const mockProfile = {
                firstname: 'Taro',
                lastname: 'Yamada',
                weight: 65.5,
                ftp: 250,
                bikes: []
            };
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => mockProfile));

            __syncAthleteData();

            expect(global.Logger.log).toHaveBeenCalledWith('アスリート: Taro Yamada');
            expect(global.Logger.log).toHaveBeenCalledWith('体重: 65.5kg, FTP: 250W, メインバイク: 未設定');
        });

        it('should do nothing if profile is null', () => {
            vi.stubGlobal('getStravaAthleteProfile', vi.fn(() => null));

            __syncAthleteData();

            expect(global.Logger.log).not.toHaveBeenCalled();
        });
    });
});
