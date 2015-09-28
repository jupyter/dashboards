This zip file bundles the dashboard web application with manifests for running
as a Docker container and deploying to a Cloud Foundry PaaS such as IBM Bluemix.

## First, a note on stability and security

The dashboard web application requires a kernel provisioner API such as tmpnb or
IPython Notebook itself. It then uses Thebe to communicate with this kernel 
service. Deploying a kernel service, properly configuring a dashboard to talk to
it, securing access, ensuring availability of all assets required for proper 
code execution, etc. are all very much works in progress.

Treat this code as proof of concept. Do not use it in production settings. Take
care to avoid privacy violations and exposing other data accessible to the 
kernel service.

## Configurating the dashboard

The dashboard contains copies of code cells that need to be executed. A pair of
environment variables determine where the execution kernels come from, as well
as the API used to control them:

* KERNEL_SERVICE_URL - the IPython server that the dashboard will leverage
* TMPNB_MODE - boolean for whether the kernel service is a multi-user tmpnb
               setup (_true_), rather than a single IPython notebook server
               (_false_)

## Running in a Docker Container

The provided Dockerfile can be used to run the dashboard application as-is. Doing
so will serve the application on port 9500 of the Docker host. The Dockerfile
specifies KERNEL_SERVICE_URL and TMPNB_MODE values for the notebook server that
generated this zip file bundle. When changed, the container should be killed and
rerun.

## Running in a Cloud Foundry PaaS

The accompanying manifest.yml file specifies the
KERNEL_SERVICE_URL and TMPNB_MODE values for the notebook server that
generated this zip file bundle. If being pushed using the `cf` CLI, the zip file
must be unpacked and its contents pushed from the filesystem. As of this writing,
 `cf` will not make use of a manifest within a zip file when pushing that zip
file. If modified in the manifest.yml, the app must be pushed again. If modified
using `cf set-env`, the app must be restaged using `cf restage <appname>` to update
its environment.
