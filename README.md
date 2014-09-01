OSM Transport Editor
====================

This tools is to make it easy to edit osm relations about transport.

I have created this project to fix the Nantes public transport network:

http://makinacorpus.github.io/osm-transport-editor/#/1733024

Technologies
============

* AngularJS
* Leaflet
* OSM (API)

Data Format
===========

Because this is javascript we use json every where so here is the format that is used internally:

A relation that contains other relations:

	{
	    "type": "FeatureCollection",
	    "properties": {
	        "id": "1733024",
	        "visible": "true",
	        "version": "24",
	        "changeset": "24081505",
	        "timestamp": "2014-07-11T12:52:35Z",
	        "user": "toutpt",
	        "uid": "1954100"
	    },
	    "options": {},
	    "members": [{
	        "type": "relation",
	        "ref": "2116454",
	        "role": "",
	        "name": "1 Beaujoire - François Mitterrand",
	        "tags": {
	            "air_conditioning": "limited",
	            "by_night": "yes",
	            "colour": "#00A440",
	            "description": "Beaujoire - François Mitterrand",
	            "line": "tram",
	            "name": "1 Beaujoire - François Mitterrand",
	            "network": "TAN",
	            "operator": "SEMITAN",
	            "ref": "1",
	            "route": "tram",
	            "route_master": "tram",
	            "state": "proposed",
	            "supervised": "yes",
	            "text_colour": "#FFFFFF",
	            "type": "route_master",
	            "url": "https://www.tan.fr/servlet/com.univ.collaboratif.utils.LectureFichiergw?ID_FICHIER=30134",
	            "wheelchair": "yes"
	        }
	    },
	    ...
	    }],
	    "features": [],
	    "relations": [],
	    "tags": {
	        "name": "TAN",
	        "network": "TAN",
	        "operator": "SEMITAN",
	        "service": "urban",
	        "type": "network",
	        "url": "http://www.tan.fr/",
	        "wikipedia": "fr:Semitan"
	    }
	}

A relation that contains ways and node:

	{
		"type": "FeatureCollection",
		"properties": {
		    "id": "2096890",
		    "visible": "true",
		    "version": "10",
		    "changeset": "24019889",
		    "timestamp": "2014-07-08T09:56:03Z",
		    "user": "toutpt",
		    "uid": "1954100"
		},
		"options": {},
		"members": [{
		    "type": "node",
		    "ref": "1687882826",
		    "role": "stop",
		    "name": "Beaujoire"
		},
		...
		"features": [{
		    "type": "Feature",
		    "properties": {
		        "amenity": "vending_machine",
		        "bench": "yes",
			    "name": "Beaujoire",
			    "operator": "SEMITAN",
		        "payment:coins": "yes",
		        "payment:debit_cards": "yes",
		        "railway": "tram_stop",
		        "ref": "BJO59",
		        "shelter": "yes",
		        "tactile_paving": "yes",
		        "vending": "public_transport_tickets",
		        "wheelchair": "yes"
		    },
		    "id": "1687882826",
		    "geometry": {
		        "type": "Point",
		        "coordinates": [-1.5260215, 47.2587955]
		    }
		},
		...
		}],
		"relations": [],
		"tags": {
		    "air_conditioning": "limited",
		    "bicycle": "limited",
		    "by_night": "yes",
		    "colour": "#00A440",
		    "description": "Beaujoire - François Mitterrand",
		    "destination": "François Mitterrand",
		    "from": "Beaujoire",
		    "line": "tram",
		    "name": "1 Beaujoire - François Mitterrand",
		    "network": "TAN",
		    "note:en": "Please keep nodes and ways in the right order",
		    "note:fr": "Merci de garder les nœuds et les tronçons dans le bon ordre",
		    "operator": "SEMITAN",
		    "ref": "1",
		    "route": "tram",
		    "state": "proposed",
		    "text_colour": "#FFFFFF",
		    "to": "François Mitterrand",
		    "type": "route",
		    "url": "https://www.tan.fr/html/plans/14H1/lignes/01.pdf",
		    "via": "Commerce",
		    "wheelchair": "yes"
		}
	}

Credits
=======

Companies
---------

* Makina-Corpus http://www.makina-corpus.com

People
------

- Jean-Michel FRANCOIS aka toutpt <toutpt@gmail.com>
