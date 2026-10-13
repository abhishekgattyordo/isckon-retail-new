'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeViewProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
  lineColor?: string;
  background?: string;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  format = 'auto',
  width = 1.5,
  height = 42,
  displayValue = true,
  fontSize = 11,
  className = '',
  lineColor = '#000000',
  background = '#ffffff',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const barcodeVal = String(value).trim() || '1234567890123';
        
        let detectedFormat = format;
        if (format === 'auto') {
          if (/^\d{13}$/.test(barcodeVal)) {
            detectedFormat = 'EAN13';
          } else if (/^\d{8}$/.test(barcodeVal)) {
            detectedFormat = 'EAN8';
          } else if (/^\d{12}$/.test(barcodeVal)) {
            detectedFormat = 'UPC';
          } else if (/^\d{10}$/.test(barcodeVal) || /^\d{10}X$/i.test(barcodeVal)) {
            detectedFormat = 'CODE128';
          } else {
            detectedFormat = 'CODE128';
          }
        }

        JsBarcode(svgRef.current, barcodeVal, {
          format: detectedFormat as any,
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          textMargin: 2,
          lineColor,
          background,
          valid: (valid) => {
            if (!valid) {
              try {
                if (svgRef.current) {
                  JsBarcode(svgRef.current, barcodeVal, {
                    format: 'CODE128',
                    width,
                    height,
                    displayValue,
                    fontSize,
                    font: 'monospace',
                    textMargin: 2,
                    lineColor,
                    background,
                  });
                }
              } catch (fallbackErr) {
                console.error("Barcode fallback error:", fallbackErr);
              }
            }
          }
        });
      } catch (err) {
        console.error("JsBarcode generation error:", err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, lineColor, background]);

  return (
    <div className={`inline-flex flex-col items-center justify-center overflow-hidden ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto block" />
    </div>
  );
};
