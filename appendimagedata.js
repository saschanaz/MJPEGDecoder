/*
* World's Smallest h.264 Encoder, by Ben Mesander.
*
* For background, see the post http://cardinalpeak.com/blog?p=488
*
* Copyright (c) 2010, Cardinal Peak, LLC.  http://cardinalpeak.com
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
*
* 1) Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
*
* 2) Redistributions in binary form must reproduce the above
*    copyright notice, this list of conditions and the following
*    disclaimer in the documentation and/or other materials provided
*    with the distribution.
*
* 3) Neither the name of Cardinal Peak nor the names of its
*    contributors may be used to endorse or promote products derived
*    from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
* "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
* LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
* FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
* CARDINAL PEAK, LLC BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
* SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
* LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
* USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
* OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
* OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
* SUCH DAMAGE.
*/
//interface SourceBuffer {
//    appendImageData(imageData: ImageData, timeStamp: number): void;
//}
//SourceBuffer.prototype.appendImageData = (imageData: ImageData, timeStamp: number) => {
//}
var _H264LosslessEncoder = (function () {
    function _H264LosslessEncoder() {
    }
    _H264LosslessEncoder.encodeFrame = function (imageData) {
        var frame = Array.prototype.concat(this.SPS, this.PPS);

        for (var i = 0; i < imageData.data.byteLength; i += 4) {
            var yuv = this.convertToYUV(imageData.data.subarray(i, i + 4));
            Array.prototype.push.apply(frame, this.sliceHeader);
        }

        frame.push(0x80);
        return new Uint8Array(frame);
    };
    _H264LosslessEncoder.convertToYUV = function (rgba) {
        var r = rgba[0], g = rgba[1], b = rgba[2];

        //alpha will be ignored
        return [
            0.299 * r + 0.587 * g + 0.114 * b,
            -0.14713 * r - 0.28886 * g + 0.436 * b,
            0.615 * r - 0.51499 * g - 0.10001 * b
        ];
    };
    _H264LosslessEncoder.SPS = [0x00, 0x00, 0x00, 0x01, 0x67, 0x42, 0x00, 0x0A, 0xF8, 0x41, 0xA2];
    _H264LosslessEncoder.PPS = [0x00, 0x00, 0x00, 0x01, 0x68, 0xCE, 0x38, 0x80];
    _H264LosslessEncoder.sliceHeader = [0x00, 0x00, 0x00, 0x01, 0x05, 0x88, 0x84, 0x21, 0xA0];
    _H264LosslessEncoder.macroblockHeader = [0x0D, 0x00];
    return _H264LosslessEncoder;
})();
//# sourceMappingURL=appendimagedata.js.map
