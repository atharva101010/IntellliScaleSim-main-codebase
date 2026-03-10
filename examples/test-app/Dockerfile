# Use nginx as base image for serving static HTML
FROM nginx:alpine

# Copy our HTML file to nginx's default serving directory
COPY index.html /usr/share/nginx/html/index.html

# Expose port 80 for web traffic
EXPOSE 80

# nginx runs automatically when container starts
CMD ["nginx", "-g", "daemon off;"]
