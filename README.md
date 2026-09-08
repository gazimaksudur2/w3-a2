# Stay&Play – Eagle Creek Golf Club

A responsive golf travel and accommodation webpage that I built as part of my front-end development assignment.

## 🌐 Live Demo

The project is deployed on Netlify and can be viewed here:

**[View Live Project](https://w3-assignment1.netlify.app/)**

---

## About the Project

For this assignment, I built a responsive **Stay&Play golf course and accommodation webpage** based around Eagle Creek Golf Club in Orlando, Florida.

My goal was to create something that feels closer to a real travel website instead of just a basic static webpage. The page brings together golf course information, nearby accommodation, pricing, reviews, weather, course facilities, and booking-related UI in one place.

While developing the project, I mainly focused on writing clean HTML, organizing a fairly large webpage properly, creating reusable CSS components, and making the complete design responsive across desktop, tablet, and mobile devices.

---

## Main Features

Some of the main features I implemented are:

* Responsive navigation bar
* Golf course breadcrumb navigation
* Course rating and tee-time information
* Responsive image gallery
* Course overview and statistics
* Stay & Play pricing section
* Nearby accommodation cards
* Property filter interface
* Pagination UI
* Embedded Google Map
* Detailed golf club highlights
* Special Stay & Play packages
* Guest review cards
* Course facilities and amenities
* Weather forecast section
* Seasonal weather information
* Nearby golf course recommendations
* Desktop booking card
* Responsive footer
* Mobile and tablet-specific layouts

---

## Technologies Used

I built this project using:

* **HTML5**
* **CSS3**
* **CSS Grid**
* **Flexbox**
* **CSS Custom Properties**
* **Media Queries**
* **Google Fonts**
* **Google Maps Embed**

For typography, I used **Montserrat** for headings and **Inter** for body text.

I did not use frameworks such as Bootstrap or Tailwind CSS. I wanted to build the layout and responsive behavior with my own CSS so I could practice the fundamentals properly.

---

## Responsive Design

Responsiveness was one of the most important parts of this project.

Instead of simply shrinking the desktop version, I changed several parts of the layout depending on the screen size.

On larger screens, the main content and booking area are displayed in a two-column layout. The booking card stays visible beside the course information while the user scrolls.

On tablet-sized screens, the main content switches to a single-column layout, the navigation becomes more compact, and the desktop booking card is replaced by a smaller Stay & Play panel.

On mobile devices, sections such as the property listings, reviews, highlights, weather information, gallery, navigation, and footer are reorganized further to make them easier to view on smaller screens.

I also added additional breakpoints for very small mobile screens so that the design remains usable without horizontal overflow.

---

## Project Structure

A simplified version of my project structure is:

```text
StayAndPlay/
│
├── index.html
├── style.css
│
└── assets/
    ├── icons/
    │   └── ...
    │
    └── images/
        └── ...
```

The `assets` directory contains the images, SVG icons, logos, weather icons, profile images, property images, and other visual resources used throughout the website.

---

## Page Sections

### Navigation

I created a sticky navigation bar containing the Stay&Play logo, navigation links, a **Book a Tee Time** button, search interface, and hamburger menu for smaller screens.

## Running the Project Locally

There is no complicated installation process because this is a front-end HTML and CSS project.

### 1. Clone the repository

```bash
git clone https://github.com/gazimaksudur2/w3-a1
```

### 2. Open the project folder

Make sure the `index.html`, CSS file `style.css`, and `assets` folder remain in their correct locations.

### 3. Run the website

You can simply open `index.html` in a web browser.

During development, I prefer using the **Live Server** extension in Visual Studio Code because it automatically refreshes the browser whenever I save my changes.

No package installation, dependency installation, or build command is required.

---

## Deployment

I deployed the completed project using **Netlify**.

The live version is available at:

**https://w3-assignment1.netlify.app/**

Deploying the website also helped me check the final layout in a real hosted environment instead of testing it only from my local machine.

---

## What I Learned

This project gave me experience working on a much larger interface than a simple landing page.

While building it, I improved my understanding of:

* Semantic HTML structure
* CSS Grid
* Flexbox
* Responsive web design
* Media queries
* Reusable CSS components
* CSS variables
* Responsive typography
* Card-based layouts
* Working with SVG icons
* Image handling
* Google Maps embedding
* Organizing a long webpage
* Designing for multiple screen sizes
* Deploying a website using Netlify

One of the biggest lessons I learned from this project is that responsive design is not just about making everything smaller. Sometimes components need to be rearranged, simplified, hidden, or replaced completely depending on the device.

---

## Final Note

I built this project to practice creating a realistic, responsive, and relatively large front-end website using core web technologies.

Instead of relying on a CSS framework, I worked directly with HTML and CSS so that I could better understand how layouts, breakpoints, spacing, typography, reusable components, and responsive behavior work together.

The current version is primarily a responsive front-end prototype, but the structure can be expanded into a complete Stay&Play platform in the future by adding JavaScript, external APIs, backend services, and a database.

### Live Project

👉 **https://w3-assignment1.netlify.app/**
