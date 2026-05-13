"use client";

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend } from 'chart.js';

// Ensure required Chart.js components are registered in the client
if (!(Chart as any).__ayur_reg) {
  Chart.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend);
  (Chart as any).__ayur_reg = true;
}

type Props = { data?: any; options?: any };

export default function BarChart({ data, options }: Props) {
  const defaultData = data ?? {
    labels: ['Nov','Dec','Jan','Feb','Mar','Apr'],
    datasets: [
      { label: 'Medical devices', data: [2,3,2,4,2,3], backgroundColor: '#185FA5' },
      { label: 'Electrical', data: [1,2,2,2,2,1], backgroundColor: '#1A6B3C' },
    ],
  };

  const defaultOptions = options ?? {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, max: 8 } },
  };

  return (
    <div style={{ width: '100%', height: 160 }}>
      <Bar data={defaultData} options={defaultOptions} />
    </div>
  );
}
