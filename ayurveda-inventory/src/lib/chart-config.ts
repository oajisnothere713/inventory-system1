import { Chart, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components once
Chart.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

export default Chart;
