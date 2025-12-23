'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CustomMeasurementsProps {
  onMeasurementsChange?: (measurements: Record<string, number | string>) => void;
  onSizeSelected?: (hasSize: boolean) => void;
  onHeightSelected?: (hasHeight: boolean) => void;
}

export function CustomMeasurements({ onMeasurementsChange, onSizeSelected, onHeightSelected }: CustomMeasurementsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(false);
  const [size, setSize] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [measurements, setMeasurements] = useState<Record<string, number>>({
    skirtLength: 0,
    blouseLength: 0,
    chest: 0,
    waist: 0,
    sleeveLength: 0,
    sleeveWidth: 0,
    armHole: 0,
    frontNeck: 0,
    backNeck: 0,
    shoulder: 0,
    whereBlouseEnds: 0
  });

  const handleMeasurementChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;
    
    const updated = { ...measurements, [field]: numValue };
    setMeasurements(updated);
    
    if (onMeasurementsChange) {
      onMeasurementsChange({
        ...updated,
        size,
        height
      });
    }
  };

  const handleSizeChange = (value: string) => {
    setSize(value);
    const hasSize = value !== '';
    if (onSizeSelected) {
      onSizeSelected(hasSize);
    }
    if (onMeasurementsChange) {
      onMeasurementsChange({
        ...measurements,
        size: value,
        height
      });
    }
  };

  const handleHeightChange = (value: string) => {
    setHeight(value);
    const hasHeight = value !== '';
    if (onHeightSelected) {
      onHeightSelected(hasHeight);
    }
    if (onMeasurementsChange) {
      onMeasurementsChange({
        ...measurements,
        size,
        height: value
      });
    }
  };

  // Generate height options from 5.0 to 5.11
  const heightOptions = [];
  for (let feet = 5; feet <= 5; feet++) {
    for (let inches = 0; inches <= 11; inches++) {
      heightOptions.push(`${feet}'${inches.toString().padStart(2, '0')}`);
    }
  }

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        <span className="text-neutral-200 font-medium">Size Chart</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 bg-neutral-800 space-y-4">
          {/* Size Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Pick your size* <span className="text-red-400">(Required)</span>
            </label>
            <select
              value={size}
              onChange={(e) => handleSizeChange(e.target.value)}
              className={`w-full px-3 py-2 bg-neutral-700 border rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                !size ? 'border-red-500/50' : 'border-neutral-600'
              }`}
              required
            >
              <option value="">Select</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
            {!size && (
              <p className="mt-1 text-xs text-red-400">Please select a size to add this item to cart</p>
            )}
          </div>

          {/* Height Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Select Height* <span className="text-red-400">(Required)</span>
            </label>
            <select
              value={height}
              onChange={(e) => handleHeightChange(e.target.value)}
              className={`w-full px-3 py-2 bg-neutral-700 border rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                !height ? 'border-red-500/50' : 'border-neutral-600'
              }`}
              required
            >
              <option value="">Select</option>
              {heightOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {!height && (
              <p className="mt-1 text-xs text-red-400">Please select a height</p>
            )}
          </div>

          {/* Additional Specifications */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Additional Specifications
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter any additional specifications"
            />
          </div>

          {/* Custom Measurements Section - Accordion */}
          <div className="pt-4 border-t border-neutral-700">
            <button
              type="button"
              onClick={() => setIsMeasurementsOpen(!isMeasurementsOpen)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-primary">Custom Measurements</h3>
              {isMeasurementsOpen ? (
                <ChevronUp className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              )}
            </button>
            
            {isMeasurementsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Skirt Length
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.skirtLength || ''}
                  onChange={(e) => handleMeasurementChange('skirtLength', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Blouse Length
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.blouseLength || ''}
                  onChange={(e) => handleMeasurementChange('blouseLength', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Chest
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.chest || ''}
                  onChange={(e) => handleMeasurementChange('chest', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Waist
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.waist || ''}
                  onChange={(e) => handleMeasurementChange('waist', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Where the blouse ends
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.whereBlouseEnds || ''}
                  onChange={(e) => handleMeasurementChange('whereBlouseEnds', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Sleeve length
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.sleeveLength || ''}
                  onChange={(e) => handleMeasurementChange('sleeveLength', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Sleeve Width
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.sleeveWidth || ''}
                  onChange={(e) => handleMeasurementChange('sleeveWidth', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Arm Hole
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.armHole || ''}
                  onChange={(e) => handleMeasurementChange('armHole', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Front neck
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.frontNeck || ''}
                  onChange={(e) => handleMeasurementChange('frontNeck', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Back neck
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.backNeck || ''}
                  onChange={(e) => handleMeasurementChange('backNeck', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Shoulder
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={measurements.shoulder || ''}
                  onChange={(e) => handleMeasurementChange('shoulder', e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

