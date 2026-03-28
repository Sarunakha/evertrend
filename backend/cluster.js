import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const numWorkers = process.env.CLUSTER_WORKERS || os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${numWorkers} workers...`);

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case, it's an HTTP server
  import('./server.js');
  console.log(`Worker ${process.pid} started`);
}

