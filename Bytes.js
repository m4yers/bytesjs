/*
 * Copyright (c) 2013 Artyom Goncharov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author Artyom Goncharov
 *
 */
(function(window, undefined) 
{
    var fromCharCode = String.fromCharCode;
    
    var CHAR_255            = fromCharCode(255);   // 11111111
    var CHAR_240            = fromCharCode(240);   // 11110000
    var CHAR_127            = fromCharCode(127);   // 01111111
    var CHAR_128            = fromCharCode(128);   // 10000000
    var CHAR_000            = fromCharCode(0);     // 00000000
    var SINGLE_ZERO         = CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000;
    var SINGLE_NAN          = CHAR_255 + CHAR_255 + CHAR_255 + CHAR_127;
    var SINGLE_INFINITY_POS = CHAR_000 + CHAR_000 + CHAR_128 + CHAR_127;
    var SINGLE_INFINITY_NEG = CHAR_000 + CHAR_000 + CHAR_127 + CHAR_255;
    var DOUBLE_ZERO         = CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000;
    var DOUBLE_NAN          = CHAR_255 + CHAR_255 + CHAR_255 + CHAR_255 + CHAR_255 + CHAR_255 + CHAR_255 + CHAR_127;
    var DOUBLE_INFINITY_POS = CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_240 + CHAR_127;
    var DOUBLE_INFINITY_NEG = CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_000 + CHAR_240 + CHAR_255;
    
    var Bytes = function (bytes)
    {
        bytes = bytes === undefined || typeof bytes !== 'string' ? '' : bytes;
        
        var self = this;
        var endian = Bytes.BIG_ENDIAN;
        var position = 0;
        var bitpos = 0;
        
        var error = function (error)
        {
            console.log(error);
            throw error;
        }
        
        var write = function (value)
        {
            if (endian === Bytes.BIG_ENDIAN)
                value = value.split('').reverse().join('');
            bytes = bytes.slice(0, position) + value + bytes.slice(position);
            position += value.length;
        }
        
        var read = function (value)
        {
            if (position + value > bytes.length)
                error('EOFError. There is not sufficient data available to read.');
            
            position += value;
            var result = bytes.slice(position - value, position);
            if (endian === Bytes.BIG_ENDIAN)
                result = result.split('').reverse().join('');
            return result;
        }
        
        var readInteger = function (length, signed)
        {
            var msb = Math.pow(2, length * 8);
            var string = read(length);
            var result = 0;
            for (var i = 0; i < length; i++)
                result += string.charCodeAt(i) << (i * 8);
           
            result &= ~0;
            result = signed && result >= msb * 0.5 ? result - msb : result;
            
            return result;
        }
        
        var writeInteger = function (length, value)
        {
            value = value === undefined ? 0 : value & (~0 >>> (32 - length * 8));
            var str = '';
            for (var i = 0; i < length; i++)
                str += fromCharCode((value >> (i * 8)) & 0xff);
            write(str);
        }
        
        this.endian = function (value)
        {
            if (value === undefined)
            {
                return endian;
            }
            else
            {
                if (value !== Bytes.BIG_ENDIAN 
                 && value !== Bytes.LITTLE_ENDIAN)
                    value = Bytes.BIG_ENDIAN;
                    
                endian = value;
            }
        }
        
        this.length = function (value)
        {
            if (value === undefined)
            {
                return bytes.length;
            }
            else
            {
                if (value < bytes.length)
                    bytes = new String(bytes.slice(0, value + 1));
                else
                    while (bytes.length != value)
                        writeByte();
            }
        }
        
        this.position = function (value)
        {
            if (value === undefined)
            {
                return position;
            }
            else
            {
                if (value < 0)
                    position = 0;
                else if (value > bytes.length)
                    position = bytes.length;
                else    
                    position = value;
                    
                bitpos = position * 8;
            }
        }
        
        this.position.inc = function (value)
        {
            value = value === undefined ? 1 : value;
            self.position(position + value);
        }
        
        this.position.dec = function (value)
        {
            value = value === undefined ? 1 : value;
            self.position(position - value);
        }
        
        this.bitpos = function (value)
        {
            if (value === undefined)
            {
                return bitpos;
            }
            else
            {
                this.position((value / 8)|0);
                bitpos = value % 8;
            }
        }
        
        this.bitpos.inc = function (value)
        {
            value = value === undefined ? 1 : value;
            self.bitpos(bitpos + value);
        }
        
        this.bitpos.dec = function (value)
        {
            value = value === undefined ? 1 : value;
            self.bitpos(bitpos - value);
        }
        
        this.clear = function ()
        {
            bytes = '';
        }
        
        this.toString = function ()
        {
            return bytes;
        }
        
    //----------------------------------
    //  read
    //----------------------------------
        this.readBit = function ()
        {
            var 
            result = this.readByte();
            result = (result >> (bitpos % 8)) & 0x01;
            position--;
            ++bitpos % 8 == 0 && this.position.inc();
            return result;
        }
        
        this.readBoolean = function ()
        {
            return !!read(1).charCodeAt(0);
        }
        
        this.readBytes = function (bytess, offset, length)
        {
            bytess = bytess instanceof Bytes ? bytess : new Bytes();
            offset = offset === undefined ? 0 : offset|0;
            length = length === undefined ? bytes.length : length|0;
            bytess.writeUTFBytes(bytes.slice(offset, offset + length));
            return bytess;
        }
         
        this.readSingle = function ()
        {
            var value = this.readUnsignedInt();
            var sgn = (value >>> 31 & 0x01) === 0 ? 1: -1;
            var exp = (value >>> 23 & 0xff) - 127;
            var fra = value & 0x7fffff;
            return sgn * Math.pow(2, exp) * (1 + fra / Math.pow(2, 23));
        }
         
        this.readDouble = function ()
        {
            var value = read(8);
            if (value == DOUBLE_ZERO)
            {
                return 0.0;
            }
            else if (value == DOUBLE_NAN)
            {
                return NaN;
            }
            else if (value == DOUBLE_INFINITY_POS)
            {
                return Infinity;
            }
            else if (value == DOUBLE_INFINITY_NEG)
            {
                return -Infinity;
            }
            else
            {
                var rest = (value.charCodeAt(0) << 0) 
                         + (value.charCodeAt(1) << 8)
                         + (value.charCodeAt(2) << 16)
                         + (value.charCodeAt(3) << 24);
                var left = (value.charCodeAt(4) << 0) 
                         + (value.charCodeAt(5) << 8)
                         + (value.charCodeAt(6) << 16)
                         + (value.charCodeAt(7) << 24);
                var sgn = (left >>> 31 & 0x01) === 0 ? 1: -1;
                var exp = (left >>> 20 & 0x7ff) - 1023;
                var fra = left & 0xfffff;
                
                if (rest < 0)
                    rest = Math.pow(2, 32) + rest;
                
                return sgn * Math.pow(2, exp) * (1 + fra / Math.pow(2, 20) + rest / Math.pow(2, 52));
            }
        }
         
        this.readByte = function ()
        {
            return readInteger(1, true);
        }
        
        this.readShort = function ()
        {
            return readInteger(2, true);
        }
         
        this.readInt = function ()
        {
            return readInteger(4, true);
        }
         
        this.readUnsignedByte = function ()
        {
            return readInteger(1);
        }
         
        this.readUnsignedShort = function ()
        {
            return readInteger(2);
        }
        
        this.readUnsignedInt = function ()
        {
            return readInteger(4);
        }
         
        this.readUTF = function ()
        {
            return read(this.readUnsignedShort());
        }
         
        this.readUTFBytes = function (length)
        {
            length = length === undefined ? bytes.length - position : length|0;
            return read(length);
        }
        
    //----------------------------------
    //  write
    //----------------------------------
        this.writeBit = function (value)
        {
            value = value === undefined ? 0 : value & 0x01;
            
            if (position == bytes.length)
            {
                this.writeByte(value);
            }
            else
            {
                var mask = 1 << (bitpos % 8);
                var byte = this.readByte() & ~mask;
                if (value) 
                    byte ^= mask;
                bytes = bytes.slice(0, position - 1) + fromCharCode(byte) + bytes.slice(position);
            }
            
            position--;
            ++bitpos % 8 == 0 && this.position.inc();
            return this;
        }
        
        this.writeBoolean = function (value)
        {
            value = value === undefined ? 0 : value ? 1 : 0;
            write(fromCharCode(value));
            return this;
        }
         
        this.writeBytes = function (bytes, offset, length)
        {
            if (bytes && bytes instanceof Bytes)
            {
                offset = offset === undefined ? 0 : offset|0;
                length = length === undefined ? bytes.length() : length|0;
                write(bytes.toString().slice(offset, offset + length))
            }
            return this;
        }
         
        this.writeSingle = function (value)
        {
            value = value === undefined ? 0.0 : parseFloat(value);
            
            var binsng = value.toString(2);
            var left = value < 0 
                ? binsng.split('-')[1].split('.')[0] 
                : binsng.split('.')[0];

            var right = binsng.split('.')[1] || [];
            var exp = 0;
            if (value > 2 || value < 1)
            {
                right = left.slice(1).concat(right);
                exp = left.length - 1;
                if (exp === 0)
                {
                    exp = -right.indexOf('1') - 1;
                    right = right.slice(-exp);
                }
            }

            right = right.slice(0, 23);
            
            exp = ((exp + 127) & 0xff) << 23;
            var fra = parseInt(right.toString(), 2) << (23 - right.length);
            var sign = (value < 0 ? 1 : 0) << 31;

            value = sign | exp | fra;
            write(fromCharCode((value >> 0)  & 0xff) 
                + fromCharCode((value >> 8)  & 0xff)
                + fromCharCode((value >> 16) & 0xff)
                + fromCharCode((value >> 24) & 0xff));
            return this;
        }
         
        this.writeDouble = function (value)
        {
            value = value === undefined ? 0.0 : parseFloat(value);
            
            if (value == 0.0)
            {
                write(DOUBLE_ZERO);
            }
            else if (isNaN(value))
            {
                write(DOUBLE_NAN);
            }
            else if (value === Infinity)
            {
                write(DOUBLE_INFINITY_POS);
            }
            else if (value === -Infinity)
            {
                write(DOUBLE_INFINITY_NEG);
            }
            else
            {
                var binsng = value.toString(2);
                var left = value < 0 
                    ? binsng.split('-')[1].split('.')[0] 
                    : binsng.split('.')[0];

                var right = binsng.split('.')[1] || [];
                var exp = 0;
                if (value > 2 || value < 1)
                {
                    right = left.slice(1).concat(right);
                    exp = left.length - 1;
                    if (exp === 0)
                    {
                        exp = -right.indexOf('1') - 1;
                        right = right.slice(-exp);
                    }
                }

                right = right.slice(0, 52);
                
                exp = (exp + 1023) << 20;
                var prt1 = right.slice(0, 20);
                var prt2 = right.slice(20);
                var fra1 = parseInt(prt1, 2) << (20 - prt1.length);
                var fra2 = (parseInt(prt2, 2) || 0) << (32 - prt2.length);
                var sign = (value < 0 ? 1 : 0) << 31;
                
                value = sign | exp | fra1;
                write(fromCharCode((fra2  >> 0)  & 0xff) 
                    + fromCharCode((fra2  >> 8)  & 0xff)
                    + fromCharCode((fra2  >> 16) & 0xff)
                    + fromCharCode((fra2  >> 24) & 0xff)
                    + fromCharCode((value >> 0)  & 0xff) 
                    + fromCharCode((value >> 8)  & 0xff)
                    + fromCharCode((value >> 16) & 0xff)
                    + fromCharCode((value >> 24) & 0xff));
            }
            
            return this;
        }
         
        this.writeByte = 
        this.writeUnsignedByte = function (value)
        {
            writeInteger(1, value);
            return this;
        }
        
        this.writeShort =
        this.writeUnsignedShort = function (value)
        {
            writeInteger(2, value);
            return this;
        }
         
        this.writeInt = 
        this.writeUnsignedInt = function (value)
        {
            writeInteger(4, value);
            return this;
        }
         
        this.writeUTF = function (value)
        {
            value = value === undefined ? '' : value + '';
            this.writeUnsignedShort(value.length);
            write(value);
        }
         
        this.writeUTFBytes = function (value)
        {
            value = value === undefined ? '' : value + '';
            write(value);
        }
    }
    
    Bytes.BIG_ENDIAN = 'big_endian';
    Bytes.LITTLE_ENDIAN = 'little_endian';
    
    window.Bytes = Bytes;
})(window);