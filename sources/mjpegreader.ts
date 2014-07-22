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
        var riff = this._getTypedData(stream, "RIFF", "AVI ");
        var targetDataStream = riff;
        var hdrlList = this._readHdrl(targetDataStream);
        targetDataStream = array.subarray(hdrlList.dataArray.byteOffset + hdrlList.dataArray.byteLength);
        var moviList = this._readMovi(targetDataStream);
        targetDataStream = array.subarray(moviList.dataArray.byteOffset + moviList.dataArray.byteLength);//JUNK safe subarray
        var indexes = this._readAVIIndex(targetDataStream);
        var exportedJPEG = this._exportJPEG(moviList.dataArray, indexes);

        return { mainHeader: hdrlList.mainHeader, JPEGs: exportedJPEG };
    }

    private static _readHdrl(stream: BlobStream) {
        var hdrlData = {
            dataStream: <BlobStream>null,
            mainHeader: <AVIMainHeader>null
        };
        return this._getTypedData(stream, "LIST", "hdrl")
            .then((hdrlList) => {
                hdrlData.dataStream = hdrlList;
                return this._readAVIMainHeader(hdrlList);
            }).then((mainHeader) => {
                hdrlData.mainHeader = mainHeader;
                return Promise.resolve(hdrlData);
            });

        //var hdrlList = this._getTypedData(stream, "LIST", "hdrl");

        //var mainHeader = this._readAVIMainHeader(hdrlList);
        //return { dataArray: hdrlList, mainHeader: mainHeader }
    }

    private static _readAVIMainHeader(stream: BlobStream) {
        //if (this._getFourCC(array, 0) !== "avih")
        //    throw new Error("Incorrect Format");
        var headerStream: BlobStream;
        var aviMainHeader: AVIMainHeader = {
            frameIntervalMicroseconds: 0,
            totalFrames: 0,
            width: 0,
            height: 0
        }
        return this._getNonTypedData(stream, "avih")
            .then((header) => {
                headerStream = header;
                return this._getLittleEndianedDword(headerStream);
            }).then((frameIntervalMicroseconds) => {
                aviMainHeader.frameIntervalMicroseconds = frameIntervalMicroseconds;
                return headerStream.seek(16);
            }).then(() => {
                return this._getLittleEndianedDword(headerStream);
            }).then((totalFrames) => {
                aviMainHeader.totalFrames = totalFrames;
                return this._getLittleEndianedDword(headerStream);
            }).then((width) => {
                aviMainHeader.width = width;
                return this._getLittleEndianedDword(headerStream);
            }).then((height) => {
                aviMainHeader.height = height;
                return Promise.resolve(aviMainHeader);
            });

        //return <AVIMainHeader>{
        //    frameIntervalMicroseconds: this._getLittleEndianedDword(headerArray, 0),
        //    totalFrames: this._getLittleEndianedDword(headerArray, 16),
        //    width: this._getLittleEndianedDword(headerArray, 32),
        //    height: this._getLittleEndianedDword(headerArray, 36)
        //};
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

    private static _getTypedData(stream: BlobStream, structureType: string, dataName: string): Promise<BlobStream> {
        var dataInfo = { type: '', length: 0 };

        return this._getFourCC(stream)
            .then((type) => { // get type
                dataInfo.type = type;
                return this._getLittleEndianedDword(stream);
            }).then((length) => { // get length
                dataInfo.length = length;
                if (dataInfo.type === structureType)
                    return this._getFourCC(stream).then((name) => { // get name
                        if (name === dataName)
                            return Promise.resolve(stream.slice(12, 8 + length));
                        else
                            return Promise.reject(new Error("Unexpected name is detected for AVI typed data."));
                    });
                else if (dataInfo.type === "JUNK") {
                    return this._getTypedData(stream.slice(length), structureType, dataName);
                }
                else
                    return Promise.reject(new Error("Incorrect AVI typed data format."));
            });
    }
    private static _getNonTypedData(stream: BlobStream, dataName: string): Promise<BlobStream> {
        var dataInfo = { name: '' };

        return this._getFourCC(stream)
            .then((name) => { // get name
                dataInfo.name = name;
                return this._getLittleEndianedDword(stream);
            }).then((length) => { // get length
                if (dataInfo.name === dataName)
                    return Promise.resolve(stream.slice(8, 4 + length));
                else if (dataInfo.name === "JUNK")
                    return this._getNonTypedData(stream.slice(length), dataName);
                else
                    return Promise.reject(new Error("Unexpected name is detected for AVI typed data."));
            });
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