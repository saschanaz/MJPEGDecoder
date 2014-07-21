//AVI File Format http://msdn.microsoft.com/en-us/library/windows/desktop/dd318187(v=vs.85).aspx
//AVI RIFF File Reference http://msdn.microsoft.com/en-us/library/windows/desktop/dd318189(v=vs.85).aspx
//AVIMAINHEADER structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318180(v=vs.85).aspx
//AVIOLDINDEX structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318181(v=vs.85).aspx
//BITMAPINFOHEADER structure http://msdn.microsoft.com/en-us/library/windows/desktop/dd318229(v=vs.85).aspx
"use strict";

interface TypedData {
    name: string;
    data: Uint8Array;
}
interface AVIMainHeader {
    frameIntervalMicroseconds: number;
    totalFrames: number;
    width: number;
    height: number;
}
interface AVIOldIndex {
    byteOffset: number;
    byteLength: number;
}
class MJPEGReader {
    static read(file: Blob) {
        return new Promise<MJPEG>((resolve, reject) => {
            var stream = new BlobStream(file);

            var aviMJPEG = this._readRiff(stream);
            var mjpeg = new MJPEG();
            mjpeg.frameInterval = aviMJPEG.mainHeader.frameIntervalMicroseconds / 1e6;
            mjpeg.totalFrames = aviMJPEG.mainHeader.totalFrames;
            mjpeg.width = aviMJPEG.mainHeader.width;
            mjpeg.height = aviMJPEG.mainHeader.height;
            mjpeg.frames = aviMJPEG.JPEGs;
            resolve(mjpeg);
        });
    }

    private static _readRiff(stream: BlobStream) {
        var riff = this._getTypedData(array, "RIFF", "AVI ");
        var targetDataArray = riff;
        var hdrlList = this._readHdrl(targetDataArray);
        targetDataArray = array.subarray(hdrlList.dataArray.byteOffset + hdrlList.dataArray.byteLength);
        var moviList = this._readMovi(targetDataArray);
        targetDataArray = array.subarray(moviList.dataArray.byteOffset + moviList.dataArray.byteLength);//JUNK safe subarray
        var indexes = this._readAVIIndex(targetDataArray);
        var exportedJPEG = this._exportJPEG(moviList.dataArray, indexes);

        return { mainHeader: hdrlList.mainHeader, JPEGs: exportedJPEG };
    }

    private static _readHdrl(array: Uint8Array) {
        var hdrlList = this._getTypedData(array, "LIST", "hdrl");

        var mainHeader = this._readAVIMainHeader(hdrlList);
        return { dataArray: hdrlList, mainHeader: mainHeader }
    }

    private static _readAVIMainHeader(array: Uint8Array) {
        //if (this._getFourCC(array, 0) !== "avih")
        //    throw new Error("Incorrect Format");
        var headerArray = this._getNonTypedData(array, "avih");//array.subarray(8, 8 + this._getLittleEndianedDword(array, 4))

        return <AVIMainHeader>{
            frameIntervalMicroseconds: this._getLittleEndianedDword(headerArray, 0),
            totalFrames: this._getLittleEndianedDword(headerArray, 16),
            width: this._getLittleEndianedDword(headerArray, 32),
            height: this._getLittleEndianedDword(headerArray, 36)
        };
    }

    private static _readMovi(array: Uint8Array) {
        var moviList = this._getTypedData(array, "LIST", "movi");
        return { dataArray: moviList };
    }

    private static _readAVIIndex(array: Uint8Array) {
        var indexData = this._getNonTypedData(array, "idx1");
        var indexes: AVIOldIndex[] = [];
        for (var i = 0; i < indexData.byteLength / 16; i += 1) {
            var offset = this._getLittleEndianedDword(indexData, i * 16 + 8);
            var length = this._getLittleEndianedDword(indexData, i * 16 + 12);
            if (length > 0)
                indexes[i] = { byteOffset: offset - 4, byteLength: length };//ignoring 'movi' string
        }
        return indexes;
    }

    private static _exportJPEG(moviList: Uint8Array, indexes: AVIOldIndex[]) {
        var JPEGs: Blob[] = [];
        for (var i = 0; i < indexes.length; i++) {
            if (indexes[i])
                JPEGs[i] = new Blob([moviList.subarray(indexes[i].byteOffset + 8, indexes[i].byteOffset + 8 + indexes[i].byteLength)], { type: "image/jpeg" });
        }
        return JPEGs;
    }

    private static _getTypedData(stream: BlobStream, structureType: string, dataName: string): Uint8Array {
        var type = this._getFourCC(array, 0);
        if (type === structureType) {
            var name = this._getFourCC(array, 8);
            if (name === dataName)
                return array.subarray(12, 8 + this._getLittleEndianedDword(array, 4));
            else
                throw new Error("Different data name is detected.");
        }
        else if (type === "JUNK") {
            var junkLength = 8 + this._getLittleEndianedDword(array, 4);
            return this._getTypedData(array.subarray(junkLength), structureType, dataName);
        }
        else
            throw new Error("Incorrect Format");
    }
    private static _getNonTypedData(array: Uint8Array, dataName: string): Uint8Array {
        var name = this._getFourCC(array, 0);
        if (name == dataName)
            return array.subarray(8, 4 + this._getLittleEndianedDword(array, 4));
        else if (name === "JUNK") {
            var junkLength = 8 + this._getLittleEndianedDword(array, 4);
            return this._getNonTypedData(array.subarray(junkLength), dataName);
        }
        else
            throw new Error("Different data name is detected.");
    }

    private static _findMarker(array: Uint8Array, type: number, index: number) {
        var nextIndex = index;
        while (true) {
            var startIndex = Array.prototype.indexOf.apply(array, [0xFF, nextIndex]);
            if (startIndex == -1)
                return -1;
            else {
                var following = array[startIndex + 1];
                if (following == type)
                    return startIndex;
            }
            nextIndex = startIndex + 1;
        }
    }

    private static _getFourCC(stream: BlobStream) {
        return new Promise<string>((resolve, reject) => {
            stream.readBytesAs = "text";
            var promise = stream.readBytes<string>(4).then((result) => {
                resolve(result.data);
            });
            stream.readBytesAs = "as-is";
        });
    }

    private static _getLittleEndianedDword(stream: BlobStream) {
        return new Promise<number>((resolve, reject) => {
            stream.readBytes<ArrayBuffer>(4).then((result) => {
                var dataView = new DataView(result.data);
                resolve(dataView.getUint32(0, true));
            });
        });
    }
}

class MJPEG {
    frameInterval: number;//seconds. Please convert it from microseconds
    get framePerSecond() {
        return 1 / this.frameInterval;
    }
    totalFrames: number;
    get duration() {
        return this.totalFrames * this.frameInterval;
    }
    width: number;
    height: number;
    frames: Blob[];

    getFrame(index: number) {
        var backward = this.getBackwardFrame(index);
        if (backward)
            return backward.data;
        else
            return;
    }
    getFrameByTime(time: number) {
        return this.getFrame(this.totalFrames * time / this.duration);
    }

    getBackwardFrame(index: number) {
        var i = index;
        while (i >= 0) {
            if (this.frames[i])
                return { index: i, data: this.frames[i] };
            else
                i--;
        }
        return;
    }

    getForwardFrame(index: number) {
        var i = index;
        while (i < this.totalFrames) {
            if (this.frames[i])
                return { index: i, data: this.frames[i] };
            else
                i++;
        }
        return;
    }
}