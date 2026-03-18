function getArticles(displayElement) {
	// Get Explorer element by id
	let voyagerElement = document.getElementById("voyager-element");
    console.log(voyagerElement)
	// Call getArticles() on the object and store the resulting array
	const articles = voyagerElement.getArticles();

	// For each article in the array, grab the title attribute 
	// and add it to a string.
	let articleNames = "";
	articles.forEach(article => {
		articleNames += article.title.length > 0 ? article.title 
			: article.titles["EN"];
		articleNames += " | ";
	});
  
	// Set the innerText of the passed in display element to 
	// the string of titles.
	displayElement.innerText = articleNames;
    console.log(articleNames)
}

function getAnnotations(displayElement) {
	// Get Explorer element by id
	var voyagerElement = document.getElementById("voyager");
	// Call getAnnotations() on the object and store the resulting array
	const annotations = voyagerElement.getAnnotations();

	// For each annotation in the array, grab the id 
	// and title attributes and add to a string.
	var annotationNames = "";
	annotations.forEach(annotation => {
		annotationNames += "[id: " + annotation.id + " title: " + annotation.title + "]";
		annotationNames += " | ";
	});
  
	// Set the innerText of the passed in display element to 
	// the string of annotation data.
	displayElement.innerText = annotationNames;
}

getArticles()
